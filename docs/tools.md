# Creating Custom Tools

Tools extend your agents' capabilities. This guide shows you how to create type-safe, production-ready tools using Zod schemas.

## Tool Basics

Every tool in Mastra follows this pattern:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const myTool = createTool({
  id: "my-tool",                          // Unique identifier
  description: "What this tool does",     // Helps LLM decide when to use it
  inputSchema: z.object({ /* ... */ }),   // Validates input
  outputSchema: z.object({ /* ... */ }),  // Validates output
  execute: async (input) => { /* ... */ },// Implementation
});
```

**Why Zod?**
- Runtime validation catches errors early
- TypeScript inference is automatic
- Clear error messages for debugging
- Self-documenting schemas

## Step-by-Step: Create a Calculator Tool

### 1. Create the Tool File

Create `src/agent/src/mastra/tools/calculator-tools.ts`:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * Basic Calculator Tool
 * Performs arithmetic operations with validation
 */
export const calculatorTool = createTool({
  id: "calculate",
  description: "Perform arithmetic calculations (+, -, *, /, ^, sqrt)",
  
  // Define and validate input
  inputSchema: z.object({
    operation: z.enum(["+", "-", "*", "/", "^", "sqrt"])
      .describe("The arithmetic operation to perform"),
    
    a: z.number()
      .describe("First number"),
    
    b: z.number()
      .optional()
      .describe("Second number (not needed for sqrt)"),
  }),
  
  // Define expected output
  outputSchema: z.object({
    result: z.number(),
    expression: z.string(),
  }),
  
  // Implementation
  execute: async ({ operation, a, b }) => {
    let result: number;
    let expression: string;
    
    switch (operation) {
      case "+":
        if (b === undefined) throw new Error("Addition requires two numbers");
        result = a + b;
        expression = `${a} + ${b} = ${result}`;
        break;
        
      case "-":
        if (b === undefined) throw new Error("Subtraction requires two numbers");
        result = a - b;
        expression = `${a} - ${b} = ${result}`;
        break;
        
      case "*":
        if (b === undefined) throw new Error("Multiplication requires two numbers");
        result = a * b;
        expression = `${a} × ${b} = ${result}`;
        break;
        
      case "/":
        if (b === undefined) throw new Error("Division requires two numbers");
        if (b === 0) throw new Error("Cannot divide by zero");
        result = a / b;
        expression = `${a} ÷ ${b} = ${result}`;
        break;
        
      case "^":
        if (b === undefined) throw new Error("Exponentiation requires two numbers");
        result = Math.pow(a, b);
        expression = `${a}^${b} = ${result}`;
        break;
        
      case "sqrt":
        if (a < 0) throw new Error("Cannot take square root of negative number");
        result = Math.sqrt(a);
        expression = `√${a} = ${result}`;
        break;
        
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    
    return { result, expression };
  },
});
```

### 2. Test Your Tool

Create `src/agent/src/mastra/tools/calculator-tools.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { calculatorTool } from "./calculator-tools.js";

describe("Calculator Tool", () => {
  describe("Input Schema Validation", () => {
    it("should validate correct input", () => {
      const input = { operation: "+", a: 5, b: 3 };
      const result = calculatorTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
    
    it("should reject invalid operation", () => {
      const input = { operation: "invalid", a: 5, b: 3 };
      const result = calculatorTool.inputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
    
    it("should allow optional b for sqrt", () => {
      const input = { operation: "sqrt", a: 16 };
      const result = calculatorTool.inputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
  
  describe("Tool Execution", () => {
    it("should add two numbers", async () => {
      const result = await calculatorTool.execute!({
        operation: "+",
        a: 5,
        b: 3,
      });
      
      expect(result.result).toBe(8);
      expect(result.expression).toBe("5 + 3 = 8");
    });
    
    it("should calculate square root", async () => {
      const result = await calculatorTool.execute!({
        operation: "sqrt",
        a: 16,
      });
      
      expect(result.result).toBe(4);
      expect(result.expression).toBe("√16 = 4");
    });
    
    it("should handle division by zero", async () => {
      await expect(
        calculatorTool.execute!({
          operation: "/",
          a: 10,
          b: 0,
        })
      ).rejects.toThrow("Cannot divide by zero");
    });
  });
  
  describe("Output Schema Validation", () => {
    it("should validate output structure", async () => {
      const result = await calculatorTool.execute!({
        operation: "*",
        a: 4,
        b: 7,
      });
      
      const validated = calculatorTool.outputSchema.safeParse(result);
      expect(validated.success).toBe(true);
    });
  });
});
```

Run tests:
```bash
pnpm --filter @mastra-starter/agent run test
```

### 3. Add Tool to an Agent

Update `src/agent/src/agents/general.ts`:

```typescript
import { calculatorTool } from "../mastra/tools/calculator-tools.js";

export const generalAgent = new Agent({
  id: "general",
  name: "general",
  instructions: `You are a helpful assistant.
  
You have access to a calculator for arithmetic operations.
Use it when users ask for calculations.`,
  model: openai("gpt-4o-mini"),
  tools: {
    // ... existing tools
    "calculate": calculatorTool, // Add calculator
  },
});
```

### 4. Test End-to-End

```bash
pnpm run cli -- chat general -m "What is 25 * 4 + 10?"
```

The agent will use the calculator tool to compute the result!

## Advanced Tool Patterns

### Pattern 1: External API Tool

```typescript
export const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  
  inputSchema: z.object({
    location: z.string().describe("City name or location"),
    units: z.enum(["metric", "imperial"]).default("metric"),
  }),
  
  outputSchema: z.object({
    temperature: z.number(),
    condition: z.string(),
    humidity: z.number(),
  }),
  
  execute: async ({ location, units }) => {
    const unitParam = units === "imperial" ? "u" : "m";
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=j1&${unitParam}`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`);
    }
    
    const data = await response.json();
    const current = data.current_condition[0];
    
    return {
      temperature: parseFloat(current.temp_C),
      condition: current.weatherDesc[0].value,
      humidity: parseFloat(current.humidity),
    };
  },
});
```

### Pattern 2: File System Tool

```typescript
export const readFileTool = createTool({
  id: "read-file",
  description: "Read contents of a text file",
  
  inputSchema: z.object({
    path: z.string().describe("File path to read"),
    encoding: z.enum(["utf-8", "ascii", "utf-16le"]).default("utf-8"),
  }),
  
  outputSchema: z.object({
    content: z.string(),
    size: z.number(),
    lines: z.number(),
  }),
  
  execute: async ({ path, encoding }) => {
    const fs = await import("node:fs/promises");
    
    // Validate path (security)
    if (path.includes("..")) {
      throw new Error("Invalid path: cannot traverse directories");
    }
    
    const content = await fs.readFile(path, encoding);
    const lines = content.split("\n").length;
    const stats = await fs.stat(path);
    
    return {
      content,
      size: stats.size,
      lines,
    };
  },
});
```

### Pattern 3: Database Tool

```typescript
export const queryDatabaseTool = createTool({
  id: "query-database",
  description: "Query the database for information",
  
  inputSchema: z.object({
    query: z.string().describe("Natural language query"),
    limit: z.number().min(1).max(100).default(10),
  }),
  
  outputSchema: z.object({
    results: z.array(z.record(z.any())),
    count: z.number(),
  }),
  
  execute: async ({ query, limit }) => {
    // Convert natural language to SQL (simplified)
    const sql = convertToSQL(query, limit);
    
    // Execute query
    const db = getDatabase();
    const results = await db.query(sql);
    
    return {
      results,
      count: results.length,
    };
  },
});
```

### Pattern 4: Context-Aware Tool

Tools can access agent context:

```typescript
export const queryMemoryTool = createTool({
  id: "query-memory",
  description: "Search conversation memory for relevant information",
  
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().default(5),
  }),
  
  outputSchema: z.object({
    results: z.array(z.object({
      content: z.string(),
      relevance: z.string(),
    })),
  }),
  
  execute: async ({ query, limit }, context) => {
    // Access agent from context
    const agent = context?.agent;
    if (!agent?.memory) {
      throw new Error("Agent must have memory configured");
    }
    
    // Query agent's memory
    const { messages } = await agent.memory.recall({
      threadId: context.threadId || "default",
      vectorSearchString: query,
      limit,
    });
    
    return {
      results: messages.map(m => ({
        content: m.content as string,
        relevance: "high",
      })),
    };
  },
});
```

## Schema Patterns

### Complex Nested Schemas

```typescript
inputSchema: z.object({
  user: z.object({
    name: z.string(),
    age: z.number().min(0),
    email: z.string().email(),
  }),
  preferences: z.object({
    theme: z.enum(["light", "dark"]),
    language: z.string().default("en"),
  }).optional(),
  tags: z.array(z.string()).max(10),
})
```

### Discriminated Unions

```typescript
inputSchema: z.discriminatedUnion("type", [
  z.object({
    type: z.literal("search"),
    query: z.string(),
  }),
  z.object({
    type: z.literal("filter"),
    field: z.string(),
    value: z.any(),
  }),
])
```

### Transform and Refinement

```typescript
inputSchema: z.object({
  temperature: z.number()
    .min(-273.15, "Below absolute zero")
    .transform(val => val + 273.15), // Convert to Kelvin
    
  email: z.string()
    .email()
    .toLowerCase()
    .refine(email => !email.endsWith("@spam.com"), {
      message: "Spam emails not allowed",
    }),
})
```

## Error Handling

### Graceful Failures

```typescript
execute: async ({ url }) => {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        data: null,
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      error: null,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      data: null,
    };
  }
}
```

### Throwing Errors

```typescript
execute: async ({ userId }) => {
  if (!userId) {
    throw new Error("userId is required");
  }
  
  const user = await findUser(userId);
  
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }
  
  return user;
}
```

## Best Practices

### 1. Descriptive IDs and Descriptions

```typescript
// ❌ Too vague
id: "tool1"
description: "Does something"

// ✅ Clear and specific
id: "convert-currency"
description: "Convert amount from one currency to another using real-time exchange rates"
```

### 2. Use `.describe()` Generously

```typescript
inputSchema: z.object({
  query: z.string()
    .describe("The search query to find relevant documents"),
  limit: z.number()
    .min(1)
    .max(100)
    .default(10)
    .describe("Maximum number of results to return (1-100)"),
})
```

### 3. Validate Output

Always define `outputSchema` to catch implementation bugs:

```typescript
// This catches if you return wrong shape
outputSchema: z.object({
  status: z.enum(["success", "error"]),
  message: z.string(),
})
```

### 4. Keep Tools Focused

```typescript
// ❌ Tool does too much
createTool({
  id: "user-management",
  // Handles create, update, delete, search...
})

// ✅ Separate tools for each operation
createTool({ id: "create-user", ... })
createTool({ id: "update-user", ... })
createTool({ id: "delete-user", ... })
createTool({ id: "search-users", ... })
```

## Testing Checklist

- [ ] Input schema validates correct inputs
- [ ] Input schema rejects invalid inputs
- [ ] Execute function handles happy path
- [ ] Execute function handles edge cases
- [ ] Execute function handles errors gracefully
- [ ] Output schema validates output
- [ ] Integration test with agent

## Next Steps

- **[Agent Development](./agents.md)** - Use your tools in agents
- **[Testing Guide](./testing.md)** - Comprehensive testing
- **[RAG Tools](./memory.md)** - Build knowledge-aware tools
