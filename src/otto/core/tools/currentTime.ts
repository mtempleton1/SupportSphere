import { z } from "zod";
import { BaseTool } from "./base.js";

export class CurrentTimeTool extends BaseTool {
  name = "currentTime";
  description = "Get the current time on the machine";
  schema = z.object({
    format: z.enum(["12h", "24h"]).optional().describe("The time format to use (12h or 24h). Defaults to 24h.")
  });

  async execute(args: z.infer<typeof this.schema>): Promise<string> {
    const now = new Date();
    const format = args.format || "24h";
    if (format === "12h") {
      return now.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return now.toLocaleTimeString('en-US', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: false 
      });
    }
  }
} 