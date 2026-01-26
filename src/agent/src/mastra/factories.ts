import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Persona configuration schema
 */
const PersonaSchema = z.object({
  name: z.string(),
  tone: z.string(),
  verbosity: z.string(),
  systemPrompt: z.string(),
});

type Persona = z.infer<typeof PersonaSchema>;

/**
 * Load persona from YAML file
 */
export function loadPersona(personaName: string = "default"): Persona {
  const personaPath = join(
    __dirname,
    "../../../personas",
    `${personaName}.yaml`,
  );

  try {
    const content = readFileSync(personaPath, "utf-8");

    // Simple YAML parser for this minimal structure
    const lines = content.split("\n");
    const persona: Record<string, string> = {};
    let currentKey = "";
    let multilineValue = "";
    let inMultiline = false;

    for (const line of lines) {
      if (line.trim().startsWith("#") || !line.trim()) continue;

      if (line.includes("|")) {
        currentKey = line.split(":")[0]!.trim();
        inMultiline = true;
        multilineValue = "";
        continue;
      }

      if (inMultiline) {
        if (line.startsWith("    ")) {
          multilineValue += line.substring(4) + "\n";
        } else {
          persona[currentKey] = multilineValue.trim();
          inMultiline = false;
        }
      } else {
        const [key, ...valueParts] = line.split(":");
        if (key && valueParts.length > 0) {
          persona[key.trim()] = valueParts
            .join(":")
            .trim()
            .replace(/['"]/g, "");
        }
      }
    }

    if (inMultiline) {
      persona[currentKey] = multilineValue.trim();
    }

    return PersonaSchema.parse(persona);
  } catch (_error) {
    // Fallback to default persona
    return {
      name: "Default",
      tone: "professional",
      verbosity: "balanced",
      systemPrompt: "You are a helpful AI assistant.",
    };
  }
}
