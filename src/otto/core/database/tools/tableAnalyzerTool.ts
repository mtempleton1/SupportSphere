import { z } from "zod";
import { BaseTool, RunnableConfig } from "../../tools/base";
import { ChatOpenAI } from "@langchain/openai";

interface TableInfo {
  name: string;
  description: string;
  category: string;
  keywords: string[];
}

// Embed table documentation directly in the code
const TABLE_DOCUMENTATION = `# Database Tables Documentation

## Core Tables

### Accounts
Primary table for managing customer accounts. Each account represents a separate company using the support system, with its own users, tickets, and configurations.

### UserProfiles
Extends the auth.users table to store additional user information. Contains both staff members and end-users, with different permissions and access levels based on their role.

### Roles
Defines user roles and their associated permissions within an account. Supports hierarchical role structures and granular permission control.

### Organizations
Represents customer organizations within an account. Used for grouping end-users and managing shared settings.

### Groups
Represents teams or departments within an account. Used primarily for staff organization and ticket assignment.

## Ticket Management

### Tickets
Central table for managing support tickets. Each record represents a support request, incident, problem, or task that needs attention. For staff users, tickets represent work items assigned to them or their groups for resolution. For regular users, tickets are support requests they have submitted.

### TicketComments
Stores all communications and updates related to tickets. Includes both public comments (visible to end-users) and private notes (staff-only).

### TicketAttachments
Junction table linking tickets to their attachments (files, images, etc.).

### TicketTags
Junction table connecting tickets to tags for categorization and filtering.

### TicketCustomFieldValues
Stores custom field values for tickets, allowing accounts to define additional ticket properties.

### TicketReadStatus
Tracks when users last read tickets for notification and status tracking.

### TicketSequences
Manages ticket numbering sequences per account.

### TicketFollowers
Tracks users following specific tickets for updates.

### TicketCCs
Manages additional users copied on ticket communications.

### TicketSharing
Manages ticket sharing between different accounts.

## Knowledge Base

### KBCategories
Top-level organization for knowledge base articles.

### KBSections
Subdivisions within knowledge base categories, supporting hierarchical organization.

### KBArticles
Knowledge base articles containing help and support content.

### KBArticleComments
User comments and feedback on knowledge base articles.

### KBArticleSections
Junction table mapping articles to sections.

### KBArticleTags
Tags for knowledge base articles.

### KBArticleVersions
Version history for knowledge base articles.

## Communication Channels

### Channels
Defines different communication channels (email, chat, phone, etc.) for ticket creation and updates.

### ChannelInbox
Configuration for email-based support channels.

### ChannelVoice
Configuration for voice/phone support channels.

### ChannelMessaging
Configuration for messaging platforms (WhatsApp, Facebook, etc.).

## Brand Management

### Brands
Manages different brands/support portals within an account.

### BrandAgents
Maps support staff to specific brands.

## Automation and Workflow

### Macros
Predefined responses and actions for common ticket scenarios.

### MacroActions
Individual actions that make up a macro.

### MacroCategories
Organizational categories for macros.

### MacroUsageStats
Tracks macro usage statistics.

### MacroTicketEvents
Records when macros are applied to tickets.

## Customization

### CustomFields
Defines additional fields that can be added to tickets.

### Tags
Reusable labels for tickets, users, and organizations.

## File Management

### Attachments
Stores metadata for files attached to tickets or articles.

## Subscription Management

### Plans
Available subscription plans for accounts.

### PlanFeatures
Features included in each subscription plan.

### Features
Individual features that can be included in plans.

### AddOns
Additional features that can be added to plans.

### AccountAddOns
Tracks which add-ons are enabled for each account.

## Audit and Tracking

### AuditLogs
Comprehensive audit trail of all significant system actions. `;

export class TableAnalyzerTool extends BaseTool {
  name = "analyzeQuery";
  description = "Analyze a natural language query to determine the most relevant database tables";
  
  private llm: ChatOpenAI;
  private tableInfo: TableInfo[] = [];
  
  schema = z.object({
    query: z.string().describe("The natural language query to analyze for relevant tables"),
    includeRelatedTables: z.boolean().optional().describe("Whether to include related tables that might be needed for joins")
  });

  constructor(openAIApiKey: string) {
    super();
    this.llm = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
      openAIApiKey: openAIApiKey
    });
    this.loadTableInfo();
  }

  private loadTableInfo() {
    try {
      // Parse the embedded markdown content
      const sections = TABLE_DOCUMENTATION.split('\n## ');
      for (const section of sections) {
        if (!section.trim()) continue;
        
        const [category, ...tables] = section.split('\n### ');
        const categoryName = category.trim();
        
        for (const table of tables) {
          if (!table.trim()) continue;
          
          const [name, ...descLines] = table.split('\n');
          const description = descLines.join(' ').trim();
          
          // Generate keywords from the table name and description
          const keywords = this.generateKeywords(name, description);
          
          this.tableInfo.push({
            name: name.trim(),
            description,
            category: categoryName,
            keywords
          });
        }
      }
    } catch (error) {
      console.error('Failed to load table information:', error);
    }
  }

  private generateKeywords(tableName: string, description: string): string[] {
    const keywords = new Set<string>();
    
    // Add table name variations
    const name = tableName.replace(/([A-Z])/g, ' $1').trim(); // Split camelCase
    keywords.add(name.toLowerCase());
    keywords.add(tableName.toLowerCase());
    
    // Add singular/plural variations
    if (name.endsWith('s')) {
      keywords.add(name.slice(0, -1).toLowerCase());
    } else {
      keywords.add(name.toLowerCase() + 's');
    }
    
    // Add common variations and synonyms
    const commonVariations: Record<string, string[]> = {
      'ticket': ['issue', 'case', 'request', 'incident', 'problem', 'task'],
      'user': ['agent', 'staff', 'customer', 'person', 'member'],
      'organization': ['org', 'company', 'business', 'enterprise'],
      'comment': ['note', 'reply', 'response', 'message'],
      'attachment': ['file', 'document', 'upload'],
      'article': ['post', 'entry', 'document', 'guide', 'tutorial']
    };
    
    // Add variations based on the table name
    Object.entries(commonVariations).forEach(([base, variations]) => {
      if (tableName.toLowerCase().includes(base)) {
        variations.forEach(v => keywords.add(v));
      }
    });
    
    return Array.from(keywords);
  }

  private async analyzeQueryWithLLM(query: string, tableInfo: TableInfo[], config?: RunnableConfig): Promise<string[]> {
    const prompt = `Given the following user query and available database tables, determine which tables are most relevant for answering the query.
Consider both direct mentions and implied needs based on the query context.

User Query: ${query}

Available Tables:
${tableInfo.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Return only a JSON array of table names, ordered by relevance. Include tables needed for common joins.
Example: ["Tickets", "UserProfiles", "Organizations"]`;

    const response = await this.llm.invoke(prompt, {
      ...config,
      runName: "table_analyzer_llm"
    });
    try {
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      return [];
    }
  }

  private findRelevantTables(query: string): Set<string> {
    const relevantTables = new Set<string>();
    const normalizedQuery = query.toLowerCase();
    
    // First pass: direct keyword matches
    this.tableInfo.forEach(table => {
      for (const keyword of table.keywords) {
        if (normalizedQuery.includes(keyword.toLowerCase())) {
          relevantTables.add(table.name);
          break;
        }
      }
    });
    
    // Add tables based on common relationships
    const relationships: Record<string, string[]> = {
      'Tickets': ['TicketComments', 'TicketAttachments', 'UserProfiles'],
      'UserProfiles': ['Organizations', 'Groups'],
      'KBArticles': ['KBSections', 'KBCategories']
    };
    
    relevantTables.forEach(table => {
      if (relationships[table]) {
        relationships[table].forEach(related => relevantTables.add(related));
      }
    });
    
    return relevantTables;
  }

  async execute(args: z.infer<typeof this.schema>, config?: RunnableConfig): Promise<string> {
    try {
      // First use keyword-based matching
      const keywordMatches = this.findRelevantTables(args.query);
      
      // Then use LLM for more sophisticated analysis
      const llmMatches = await this.analyzeQueryWithLLM(args.query, this.tableInfo, config);
      
      // Combine both results, with LLM matches taking precedence in ordering
      const combinedTables = new Set([...llmMatches, ...keywordMatches]);
      
      // If includeRelatedTables is false, filter out related tables
      const finalTables = args.includeRelatedTables === false
        ? llmMatches.filter(t => keywordMatches.has(t))
        : Array.from(combinedTables);

      return JSON.stringify({
        success: true,
        tables: finalTables,
        keywordMatches: Array.from(keywordMatches),
        llmMatches: llmMatches
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
} 