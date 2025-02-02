import { z } from "zod";
import { BaseTool, RunnableConfig } from "../../tools/base";
import { ChatOpenAI } from "@langchain/openai";
import { SchemaManager } from "../schema/schemaManager";
import { TableSchema } from "../types/queryTypes";
import { TableAnalyzerTool } from "./tableAnalyzerTool";

export class SchemaFilterTool extends BaseTool {
  name = "filterSchema";
  description = "Filter the database schema to only include tables and information relevant to a specific query";
  
  private llm: ChatOpenAI;
  private schemaManager: SchemaManager;
  private tableAnalyzer: TableAnalyzerTool;

  schema = z.object({
    query: z.string().describe("The natural language query to analyze for relevant schema information")
  });

  constructor(openAIApiKey: string) {
    super();
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
      openAIApiKey: openAIApiKey
    });
    this.schemaManager = SchemaManager.getInstance();
    this.tableAnalyzer = new TableAnalyzerTool(openAIApiKey);
  }

  private filterSchemaForTables(schema: Map<string, TableSchema>, relevantTables: Set<string>): string {
    let filteredSchema = '';
    schema.forEach((tableSchema, tableName) => {
      if (relevantTables.has(tableName)) {
        filteredSchema += `Table: ${tableName}\n`;
        filteredSchema += `Description: ${tableSchema.description}\n\n`;
        
        filteredSchema += 'Columns:\n';
        tableSchema.columns.forEach(col => {
          filteredSchema += `  - ${col.name} (${col.type})${col.isPrimaryKey ? ' PRIMARY KEY' : ''}${col.isNullable ? ' NULL' : ' NOT NULL'}\n`;
          filteredSchema += `    Description: ${col.description}\n`;
        });
        
        if (tableSchema.relationships.length > 0) {
          const relevantRelationships = tableSchema.relationships.filter(
            rel => relevantTables.has(rel.table)
          );
          
          if (relevantRelationships.length > 0) {
            filteredSchema += '\nRelationships:\n';
            relevantRelationships.forEach(rel => {
              filteredSchema += `  - ${rel.from} -> ${rel.table}.${rel.to}\n`;
              filteredSchema += `    Description: ${rel.description}\n`;
            });
          }
        }

        const examples = tableSchema.examples || [];
        if (examples.length > 0) {
          filteredSchema += '\nExample Queries:\n';
          examples.forEach(ex => {
            filteredSchema += `  - ${ex.description}:\n    ${ex.query}\n`;
          });
        }
        
        filteredSchema += '\n';
      }
    });
    return filteredSchema;
  }

  async execute(args: z.infer<typeof this.schema>, config?: RunnableConfig): Promise<string> {
    try {
      
      // Get the full schema
      const schema = await this.schemaManager.getSchema();
      
      // Use the TableAnalyzer to determine relevant tables
      const analyzerResult = await this.tableAnalyzer.execute({
        query: args.query,
        includeRelatedTables: true
      }, config);
      
      const { tables: relevantTableNames } = JSON.parse(analyzerResult).success 
        ? JSON.parse(analyzerResult) as { tables: string[] }
        : { tables: [] };
      
      const relevantTables = new Set<string>(relevantTableNames);
      
      // Filter the schema to only include relevant tables
      const filteredSchema = this.filterSchemaForTables(schema, relevantTables);
      

      return JSON.stringify({
        success: true,
        schema: filteredSchema,
        relevantTables: Array.from(relevantTables)
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
} 