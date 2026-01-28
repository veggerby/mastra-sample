import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { embed } from "ai";
import { vector, embeddingModel, getKnowledgeIndexName } from "../../rag.js";

/**
 * Research Report Workflow
 *
 * This workflow demonstrates key Mastra workflow features:
 * - Multi-step execution with clear data flow
 * - Direct vector store and agent access
 * - Workflow state management
 * - Type-safe input/output schemas
 *
 * The workflow:
 * 1. Queries the knowledge base for information on a topic
 * 2. Gets current timestamp for the report
 * 3. Uses the general agent to synthesize a formatted research report
 */

// Step 1: Query knowledge base for information
const queryKnowledgeBaseStep = createStep({
  id: "query-knowledge-base",
  inputSchema: z.object({
    topic: z.string().describe("The research topic to query"),
    maxResults: z.number().describe("Maximum number of results to retrieve"),
  }),
  outputSchema: z.object({
    findings: z.string().describe("Combined findings from knowledge base"),
    sourceCount: z.number().describe("Number of sources found"),
  }),
  stateSchema: z.object({
    researchStartTime: z.string().optional(),
  }),
  execute: async ({ inputData, setState }) => {
    // Track when research started
    setState({ researchStartTime: new Date().toISOString() });

    // Query the knowledge base directly using vector store
    const indexName = getKnowledgeIndexName();

    const { embedding } = await embed({
      model: embeddingModel,
      value: inputData.topic,
    });

    const results = await vector.query({
      indexName,
      queryVector: embedding,
      topK: inputData.maxResults,
      minScore: 0.3,
    });

    // Format findings from vector results
    const findings = results
      .map((r, idx) => {
        // Access content from metadata field (LibSQL Vector format)
        const rAny = r as any;
        const content =
          rAny.metadata?.content ?? rAny.metadata?.text ?? rAny.document ?? "";
        const score = r.score ?? 0;
        return `[${idx + 1}] (score: ${score.toFixed(2)})\n${content}`;
      })
      .join("\n\n");

    return {
      findings: findings || "No relevant information found in knowledge base.",
      sourceCount: results.length,
    };
  },
});

// Step 2: Get current time and metadata
const getMetadataStep = createStep({
  id: "get-metadata",
  inputSchema: z.object({
    findings: z.string(),
    sourceCount: z.number(),
  }),
  outputSchema: z.object({
    findings: z.string(),
    sourceCount: z.number(),
    timestamp: z.string(),
    reportDate: z.string(),
  }),
  stateSchema: z.object({
    researchStartTime: z.string().optional(),
    metadataAddedTime: z.string().optional(),
  }),
  execute: async ({ inputData, state, setState }) => {
    // Get current time
    const now = new Date();
    const timestamp = now.toISOString();
    const reportDate = now.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Update state
    setState({
      ...state,
      metadataAddedTime: now.toISOString(),
    });

    return {
      findings: inputData.findings,
      sourceCount: inputData.sourceCount,
      timestamp,
      reportDate,
    };
  },
});

// Step 3: Use agent to synthesize the report
const synthesizeReportStep = createStep({
  id: "synthesize-report",
  inputSchema: z.object({
    findings: z.string(),
    sourceCount: z.number(),
    timestamp: z.string(),
    reportDate: z.string(),
  }),
  outputSchema: z.object({
    report: z.string().describe("The final formatted research report"),
    summary: z.string().describe("Executive summary of findings"),
  }),
  stateSchema: z.object({
    researchStartTime: z.string().optional(),
    metadataAddedTime: z.string().optional(),
    reportCompletedTime: z.string().optional(),
  }),
  execute: async ({ inputData, mastra, state, setState }) => {
    // Get the general agent
    const generalAgent = mastra?.getAgent("general");
    if (!generalAgent) {
      throw new Error("General agent not found");
    }

    // Create a prompt for the agent to synthesize the report
    const prompt = `You are a research analyst. Based on the following information, create a well-formatted research report.

Research Findings:
${inputData.findings}

Sources Consulted: ${inputData.sourceCount}
Report Date: ${inputData.reportDate}
Generated At: ${inputData.timestamp}

Please create:
1. A brief executive summary (2-3 sentences)
2. A detailed research report with the following sections:
   - Overview
   - Key Findings
   - Analysis
   - Conclusion

Format the report in Markdown with clear headings.`;

    // Generate the report using the agent
    const response = await generalAgent.generate([
      {
        role: "user",
        content: prompt,
      },
    ]);

    const report = response.text || "No report generated";

    // Extract a summary (first paragraph or first 200 chars)
    const summaryMatch = report.match(
      /##\s*Executive Summary\s*\n\n(.*?)(?=\n\n##|\n\n$|$)/s,
    );
    const summary = summaryMatch
      ? summaryMatch[1].trim()
      : report.substring(0, 200) + "...";

    // Mark workflow completion
    setState({
      ...state,
      reportCompletedTime: new Date().toISOString(),
    });

    return {
      report,
      summary,
    };
  },
});

// Create the workflow by composing steps
export const researchReportWorkflow = createWorkflow({
  id: "research-report-workflow",
  inputSchema: z.object({
    topic: z.string().describe("The research topic to investigate"),
    maxResults: z.number().describe("Maximum number of knowledge base results"),
  }),
  outputSchema: z.object({
    report: z.string().describe("The final formatted research report"),
    summary: z.string().describe("Executive summary of findings"),
  }),
  stateSchema: z.object({
    researchStartTime: z.string().optional(),
    metadataAddedTime: z.string().optional(),
    reportCompletedTime: z.string().optional(),
  }),
})
  .then(queryKnowledgeBaseStep)
  .then(getMetadataStep)
  .then(synthesizeReportStep)
  .commit();
