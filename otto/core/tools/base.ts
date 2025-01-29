export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract execute(args: any): Promise<any>;
} 