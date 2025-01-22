export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      AccountAddOns: {
        Row: {
          accountId: string
          addOnId: string
          createdAt: string | null
        }
        Insert: {
          accountId: string
          addOnId: string
          createdAt?: string | null
        }
        Update: {
          accountId?: string
          addOnId?: string
          createdAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AccountAddOns_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "AccountAddOns_addOnId_fkey"
            columns: ["addOnId"]
            isOneToOne: false
            referencedRelation: "AddOns"
            referencedColumns: ["addOnId"]
          },
        ]
      }
      Accounts: {
        Row: {
          accountId: string
          createdAt: string | null
          defaultGroupId: string | null
          endUserAccountCreationType: Database["public"]["Enums"]["end_user_account_creation_type"]
          favicon: string | null
          name: string
          ownerId: string | null
          planId: string | null
          subdomain: string
          updatedAt: string | null
        }
        Insert: {
          accountId?: string
          createdAt?: string | null
          defaultGroupId?: string | null
          endUserAccountCreationType?: Database["public"]["Enums"]["end_user_account_creation_type"]
          favicon?: string | null
          name: string
          ownerId?: string | null
          planId?: string | null
          subdomain: string
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          createdAt?: string | null
          defaultGroupId?: string | null
          endUserAccountCreationType?: Database["public"]["Enums"]["end_user_account_creation_type"]
          favicon?: string | null
          name?: string
          ownerId?: string | null
          planId?: string | null
          subdomain?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Accounts_defaultGroupId_fkey"
            columns: ["defaultGroupId"]
            isOneToOne: false
            referencedRelation: "Groups"
            referencedColumns: ["groupId"]
          },
          {
            foreignKeyName: "Accounts_ownerId_fkey"
            columns: ["ownerId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "Accounts_planId_fkey"
            columns: ["planId"]
            isOneToOne: false
            referencedRelation: "Plans"
            referencedColumns: ["planId"]
          },
        ]
      }
      AddOns: {
        Row: {
          addOnId: string
          createdAt: string | null
          description: string | null
          name: string
          pricingModel: string | null
          updatedAt: string | null
        }
        Insert: {
          addOnId?: string
          createdAt?: string | null
          description?: string | null
          name: string
          pricingModel?: string | null
          updatedAt?: string | null
        }
        Update: {
          addOnId?: string
          createdAt?: string | null
          description?: string | null
          name?: string
          pricingModel?: string | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      Attachments: {
        Row: {
          accountId: string
          attachmentId: string
          createdAt: string | null
          fileName: string
          fileSize: number
          isPublic: boolean | null
          metadata: Json | null
          mimeType: string
          storageKey: string
          thumbnailStorageKey: string | null
          updatedAt: string | null
          uploadedById: string
        }
        Insert: {
          accountId: string
          attachmentId?: string
          createdAt?: string | null
          fileName: string
          fileSize: number
          isPublic?: boolean | null
          metadata?: Json | null
          mimeType: string
          storageKey: string
          thumbnailStorageKey?: string | null
          updatedAt?: string | null
          uploadedById: string
        }
        Update: {
          accountId?: string
          attachmentId?: string
          createdAt?: string | null
          fileName?: string
          fileSize?: number
          isPublic?: boolean | null
          metadata?: Json | null
          mimeType?: string
          storageKey?: string
          thumbnailStorageKey?: string | null
          updatedAt?: string | null
          uploadedById?: string
        }
        Relationships: [
          {
            foreignKeyName: "Attachments_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "Attachments_uploadedById_fkey"
            columns: ["uploadedById"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      AuditLogs: {
        Row: {
          accountId: string
          action: Database["public"]["Enums"]["audit_action"]
          actorId: string
          auditId: string
          changes: Json
          entityId: string
          entityType: Database["public"]["Enums"]["audit_entity_type"]
          ipAddress: unknown | null
          metadata: Json | null
          performedAt: string
          userAgent: string | null
        }
        Insert: {
          accountId: string
          action: Database["public"]["Enums"]["audit_action"]
          actorId: string
          auditId?: string
          changes: Json
          entityId: string
          entityType: Database["public"]["Enums"]["audit_entity_type"]
          ipAddress?: unknown | null
          metadata?: Json | null
          performedAt?: string
          userAgent?: string | null
        }
        Update: {
          accountId?: string
          action?: Database["public"]["Enums"]["audit_action"]
          actorId?: string
          auditId?: string
          changes?: Json
          entityId?: string
          entityType?: Database["public"]["Enums"]["audit_entity_type"]
          ipAddress?: unknown | null
          metadata?: Json | null
          performedAt?: string
          userAgent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditLogs_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "AuditLogs_actorId_fkey"
            columns: ["actorId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      AutomaticTagRules: {
        Row: {
          accountId: string
          createdAt: string | null
          description: string | null
          isActive: boolean | null
          keyword: string
          name: string
          ruleId: string
          tag: string
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          createdAt?: string | null
          description?: string | null
          isActive?: boolean | null
          keyword: string
          name: string
          ruleId?: string
          tag: string
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          createdAt?: string | null
          description?: string | null
          isActive?: boolean | null
          keyword?: string
          name?: string
          ruleId?: string
          tag?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AutomaticTagRules_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
        ]
      }
      BrandAgents: {
        Row: {
          brandId: string
          createdAt: string | null
          userId: string
        }
        Insert: {
          brandId: string
          createdAt?: string | null
          userId: string
        }
        Update: {
          brandId?: string
          createdAt?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "BrandAgents_brandId_fkey"
            columns: ["brandId"]
            isOneToOne: false
            referencedRelation: "Brands"
            referencedColumns: ["brandId"]
          },
          {
            foreignKeyName: "BrandAgents_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      Brands: {
        Row: {
          accountId: string
          brandId: string
          brandSignature: string | null
          createdAt: string | null
          description: string | null
          hostMapping: string | null
          isActive: boolean | null
          isAgentBrand: boolean | null
          isDefault: boolean | null
          logo: string | null
          name: string
          sslCertificate: string | null
          subdomain: string
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          brandId?: string
          brandSignature?: string | null
          createdAt?: string | null
          description?: string | null
          hostMapping?: string | null
          isActive?: boolean | null
          isAgentBrand?: boolean | null
          isDefault?: boolean | null
          logo?: string | null
          name: string
          sslCertificate?: string | null
          subdomain: string
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          brandId?: string
          brandSignature?: string | null
          createdAt?: string | null
          description?: string | null
          hostMapping?: string | null
          isActive?: boolean | null
          isAgentBrand?: boolean | null
          isDefault?: boolean | null
          logo?: string | null
          name?: string
          sslCertificate?: string | null
          subdomain?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Brands_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
        ]
      }
      ChannelInbox: {
        Row: {
          channelId: string
          createdAt: string | null
          customDomain: string | null
          email: string
          forwardingAddress: string | null
          signature: string | null
          updatedAt: string | null
        }
        Insert: {
          channelId: string
          createdAt?: string | null
          customDomain?: string | null
          email: string
          forwardingAddress?: string | null
          signature?: string | null
          updatedAt?: string | null
        }
        Update: {
          channelId?: string
          createdAt?: string | null
          customDomain?: string | null
          email?: string
          forwardingAddress?: string | null
          signature?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ChannelInbox_channelId_fkey"
            columns: ["channelId"]
            isOneToOne: true
            referencedRelation: "Channels"
            referencedColumns: ["channelId"]
          },
        ]
      }
      ChannelMessaging: {
        Row: {
          channelId: string
          createdAt: string | null
          providerAccountId: string
          providerPhoneNumber: string | null
          providerUsername: string | null
          updatedAt: string | null
          webhookUrl: string | null
        }
        Insert: {
          channelId: string
          createdAt?: string | null
          providerAccountId: string
          providerPhoneNumber?: string | null
          providerUsername?: string | null
          updatedAt?: string | null
          webhookUrl?: string | null
        }
        Update: {
          channelId?: string
          createdAt?: string | null
          providerAccountId?: string
          providerPhoneNumber?: string | null
          providerUsername?: string | null
          updatedAt?: string | null
          webhookUrl?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ChannelMessaging_channelId_fkey"
            columns: ["channelId"]
            isOneToOne: true
            referencedRelation: "Channels"
            referencedColumns: ["channelId"]
          },
        ]
      }
      Channels: {
        Row: {
          accountId: string
          brandId: string | null
          channelId: string
          configuration: Json | null
          createdAt: string | null
          description: string | null
          isEnabled: boolean | null
          name: string
          type: Database["public"]["Enums"]["channel_type"]
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          brandId?: string | null
          channelId?: string
          configuration?: Json | null
          createdAt?: string | null
          description?: string | null
          isEnabled?: boolean | null
          name: string
          type: Database["public"]["Enums"]["channel_type"]
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          brandId?: string | null
          channelId?: string
          configuration?: Json | null
          createdAt?: string | null
          description?: string | null
          isEnabled?: boolean | null
          name?: string
          type?: Database["public"]["Enums"]["channel_type"]
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Channels_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "Channels_brandId_fkey"
            columns: ["brandId"]
            isOneToOne: false
            referencedRelation: "Brands"
            referencedColumns: ["brandId"]
          },
        ]
      }
      ChannelVoice: {
        Row: {
          channelId: string
          createdAt: string | null
          greeting: string | null
          phoneNumber: string
          recordCalls: boolean | null
          transcribeVoicemail: boolean | null
          updatedAt: string | null
          voicemailGreeting: string | null
        }
        Insert: {
          channelId: string
          createdAt?: string | null
          greeting?: string | null
          phoneNumber: string
          recordCalls?: boolean | null
          transcribeVoicemail?: boolean | null
          updatedAt?: string | null
          voicemailGreeting?: string | null
        }
        Update: {
          channelId?: string
          createdAt?: string | null
          greeting?: string | null
          phoneNumber?: string
          recordCalls?: boolean | null
          transcribeVoicemail?: boolean | null
          updatedAt?: string | null
          voicemailGreeting?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ChannelVoice_channelId_fkey"
            columns: ["channelId"]
            isOneToOne: true
            referencedRelation: "Channels"
            referencedColumns: ["channelId"]
          },
        ]
      }
      CommentAttachments: {
        Row: {
          attachmentId: string
          commentId: string
          createdAt: string | null
        }
        Insert: {
          attachmentId: string
          commentId: string
          createdAt?: string | null
        }
        Update: {
          attachmentId?: string
          commentId?: string
          createdAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "CommentAttachments_attachmentId_fkey"
            columns: ["attachmentId"]
            isOneToOne: false
            referencedRelation: "Attachments"
            referencedColumns: ["attachmentId"]
          },
          {
            foreignKeyName: "CommentAttachments_commentId_fkey"
            columns: ["commentId"]
            isOneToOne: false
            referencedRelation: "TicketComments"
            referencedColumns: ["commentId"]
          },
        ]
      }
      CommentReadStatus: {
        Row: {
          commentId: string
          readAt: string
          userId: string
        }
        Insert: {
          commentId: string
          readAt?: string
          userId: string
        }
        Update: {
          commentId?: string
          readAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "CommentReadStatus_commentId_fkey"
            columns: ["commentId"]
            isOneToOne: false
            referencedRelation: "TicketComments"
            referencedColumns: ["commentId"]
          },
          {
            foreignKeyName: "CommentReadStatus_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      CustomFields: {
        Row: {
          accountId: string
          createdAt: string | null
          defaultValue: string | null
          description: string | null
          fieldId: string
          fieldType: string
          isActive: boolean | null
          isRequired: boolean | null
          name: string
          options: Json | null
          position: number | null
          updatedAt: string | null
          validationRules: Json | null
        }
        Insert: {
          accountId: string
          createdAt?: string | null
          defaultValue?: string | null
          description?: string | null
          fieldId?: string
          fieldType: string
          isActive?: boolean | null
          isRequired?: boolean | null
          name: string
          options?: Json | null
          position?: number | null
          updatedAt?: string | null
          validationRules?: Json | null
        }
        Update: {
          accountId?: string
          createdAt?: string | null
          defaultValue?: string | null
          description?: string | null
          fieldId?: string
          fieldType?: string
          isActive?: boolean | null
          isRequired?: boolean | null
          name?: string
          options?: Json | null
          position?: number | null
          updatedAt?: string | null
          validationRules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "CustomFields_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
        ]
      }
      Features: {
        Row: {
          createdAt: string | null
          description: string | null
          featureId: string
          isAddOn: boolean | null
          name: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          description?: string | null
          featureId?: string
          isAddOn?: boolean | null
          name: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          description?: string | null
          featureId?: string
          isAddOn?: boolean | null
          name?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      GroupOrganizationMapping: {
        Row: {
          groupId: string
          organizationId: string
        }
        Insert: {
          groupId: string
          organizationId: string
        }
        Update: {
          groupId?: string
          organizationId?: string
        }
        Relationships: [
          {
            foreignKeyName: "GroupOrganizationMapping_groupId_fkey"
            columns: ["groupId"]
            isOneToOne: false
            referencedRelation: "Groups"
            referencedColumns: ["groupId"]
          },
          {
            foreignKeyName: "GroupOrganizationMapping_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organizations"
            referencedColumns: ["organizationId"]
          },
        ]
      }
      Groups: {
        Row: {
          accountId: string
          createdAt: string | null
          description: string | null
          groupId: string
          isPrivate: boolean | null
          name: string
          solvedTicketReassignmentStrategy: string | null
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          createdAt?: string | null
          description?: string | null
          groupId?: string
          isPrivate?: boolean | null
          name: string
          solvedTicketReassignmentStrategy?: string | null
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          createdAt?: string | null
          description?: string | null
          groupId?: string
          isPrivate?: boolean | null
          name?: string
          solvedTicketReassignmentStrategy?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Groups_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
        ]
      }
      KBArticleAttachments: {
        Row: {
          articleId: string
          attachmentId: string
          createdAt: string | null
          position: number | null
        }
        Insert: {
          articleId: string
          attachmentId: string
          createdAt?: string | null
          position?: number | null
        }
        Update: {
          articleId?: string
          attachmentId?: string
          createdAt?: string | null
          position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "KBArticleAttachments_articleId_fkey"
            columns: ["articleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
          {
            foreignKeyName: "KBArticleAttachments_attachmentId_fkey"
            columns: ["attachmentId"]
            isOneToOne: false
            referencedRelation: "Attachments"
            referencedColumns: ["attachmentId"]
          },
        ]
      }
      KBArticleComments: {
        Row: {
          articleId: string
          authorId: string
          commentId: string
          content: string
          createdAt: string | null
          isPublic: boolean | null
          updatedAt: string | null
        }
        Insert: {
          articleId: string
          authorId: string
          commentId?: string
          content: string
          createdAt?: string | null
          isPublic?: boolean | null
          updatedAt?: string | null
        }
        Update: {
          articleId?: string
          authorId?: string
          commentId?: string
          content?: string
          createdAt?: string | null
          isPublic?: boolean | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "KBArticleComments_articleId_fkey"
            columns: ["articleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
          {
            foreignKeyName: "KBArticleComments_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      KBArticles: {
        Row: {
          accountId: string
          archivedAt: string | null
          articleId: string
          authorId: string
          body: string
          createdAt: string | null
          isCommentsEnabled: boolean | null
          isSubscriptionsEnabled: boolean | null
          locale: Database["public"]["Enums"]["content_locale"]
          position: number | null
          publishedAt: string | null
          sourceArticleId: string | null
          state: Database["public"]["Enums"]["article_state"]
          title: string
          updatedAt: string | null
          viewCount: number | null
          voteDownCount: number | null
          voteUpCount: number | null
        }
        Insert: {
          accountId: string
          archivedAt?: string | null
          articleId?: string
          authorId: string
          body: string
          createdAt?: string | null
          isCommentsEnabled?: boolean | null
          isSubscriptionsEnabled?: boolean | null
          locale?: Database["public"]["Enums"]["content_locale"]
          position?: number | null
          publishedAt?: string | null
          sourceArticleId?: string | null
          state?: Database["public"]["Enums"]["article_state"]
          title: string
          updatedAt?: string | null
          viewCount?: number | null
          voteDownCount?: number | null
          voteUpCount?: number | null
        }
        Update: {
          accountId?: string
          archivedAt?: string | null
          articleId?: string
          authorId?: string
          body?: string
          createdAt?: string | null
          isCommentsEnabled?: boolean | null
          isSubscriptionsEnabled?: boolean | null
          locale?: Database["public"]["Enums"]["content_locale"]
          position?: number | null
          publishedAt?: string | null
          sourceArticleId?: string | null
          state?: Database["public"]["Enums"]["article_state"]
          title?: string
          updatedAt?: string | null
          viewCount?: number | null
          voteDownCount?: number | null
          voteUpCount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "KBArticles_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "KBArticles_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "KBArticles_sourceArticleId_fkey"
            columns: ["sourceArticleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
        ]
      }
      KBArticleSections: {
        Row: {
          articleId: string
          createdAt: string | null
          position: number | null
          sectionId: string
        }
        Insert: {
          articleId: string
          createdAt?: string | null
          position?: number | null
          sectionId: string
        }
        Update: {
          articleId?: string
          createdAt?: string | null
          position?: number | null
          sectionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "KBArticleSections_articleId_fkey"
            columns: ["articleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
          {
            foreignKeyName: "KBArticleSections_sectionId_fkey"
            columns: ["sectionId"]
            isOneToOne: false
            referencedRelation: "KBSections"
            referencedColumns: ["sectionId"]
          },
        ]
      }
      KBArticleSubscriptions: {
        Row: {
          articleId: string
          createdAt: string | null
          userId: string
        }
        Insert: {
          articleId: string
          createdAt?: string | null
          userId: string
        }
        Update: {
          articleId?: string
          createdAt?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "KBArticleSubscriptions_articleId_fkey"
            columns: ["articleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
          {
            foreignKeyName: "KBArticleSubscriptions_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      KBArticleTags: {
        Row: {
          articleId: string
          createdAt: string | null
          tag: string
        }
        Insert: {
          articleId: string
          createdAt?: string | null
          tag: string
        }
        Update: {
          articleId?: string
          createdAt?: string | null
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "KBArticleTags_articleId_fkey"
            columns: ["articleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
        ]
      }
      KBArticleUserSegments: {
        Row: {
          articleId: string
          createdAt: string | null
          segmentId: string
        }
        Insert: {
          articleId: string
          createdAt?: string | null
          segmentId: string
        }
        Update: {
          articleId?: string
          createdAt?: string | null
          segmentId?: string
        }
        Relationships: [
          {
            foreignKeyName: "KBArticleUserSegments_articleId_fkey"
            columns: ["articleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
        ]
      }
      KBArticleVersions: {
        Row: {
          articleId: string
          body: string
          changeNote: string | null
          createdAt: string | null
          editorId: string
          title: string
          versionId: string
        }
        Insert: {
          articleId: string
          body: string
          changeNote?: string | null
          createdAt?: string | null
          editorId: string
          title: string
          versionId?: string
        }
        Update: {
          articleId?: string
          body?: string
          changeNote?: string | null
          createdAt?: string | null
          editorId?: string
          title?: string
          versionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "KBArticleVersions_articleId_fkey"
            columns: ["articleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
          {
            foreignKeyName: "KBArticleVersions_editorId_fkey"
            columns: ["editorId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      KBCategories: {
        Row: {
          accountId: string
          categoryId: string
          createdAt: string | null
          description: string | null
          isVisible: boolean | null
          name: string
          position: number | null
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          categoryId?: string
          createdAt?: string | null
          description?: string | null
          isVisible?: boolean | null
          name: string
          position?: number | null
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          categoryId?: string
          createdAt?: string | null
          description?: string | null
          isVisible?: boolean | null
          name?: string
          position?: number | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "KBCategories_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
        ]
      }
      KBSections: {
        Row: {
          accountId: string
          categoryId: string | null
          createdAt: string | null
          description: string | null
          isVisible: boolean | null
          name: string
          parentSectionId: string | null
          position: number | null
          sectionId: string
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          categoryId?: string | null
          createdAt?: string | null
          description?: string | null
          isVisible?: boolean | null
          name: string
          parentSectionId?: string | null
          position?: number | null
          sectionId?: string
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          categoryId?: string | null
          createdAt?: string | null
          description?: string | null
          isVisible?: boolean | null
          name?: string
          parentSectionId?: string | null
          position?: number | null
          sectionId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "KBSections_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "KBSections_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "KBCategories"
            referencedColumns: ["categoryId"]
          },
          {
            foreignKeyName: "KBSections_parentSectionId_fkey"
            columns: ["parentSectionId"]
            isOneToOne: false
            referencedRelation: "KBSections"
            referencedColumns: ["sectionId"]
          },
        ]
      }
      MacroActions: {
        Row: {
          actionId: string
          actionType: string
          createdAt: string | null
          field: string | null
          macroId: string
          position: number
          updatedAt: string | null
          value: string | null
        }
        Insert: {
          actionId?: string
          actionType: string
          createdAt?: string | null
          field?: string | null
          macroId: string
          position: number
          updatedAt?: string | null
          value?: string | null
        }
        Update: {
          actionId?: string
          actionType?: string
          createdAt?: string | null
          field?: string | null
          macroId?: string
          position?: number
          updatedAt?: string | null
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MacroActions_macroId_fkey"
            columns: ["macroId"]
            isOneToOne: false
            referencedRelation: "Macros"
            referencedColumns: ["macroId"]
          },
        ]
      }
      MacroCategories: {
        Row: {
          accountId: string
          categoryId: string
          createdAt: string | null
          description: string | null
          name: string
          parentCategoryId: string | null
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          categoryId?: string
          createdAt?: string | null
          description?: string | null
          name: string
          parentCategoryId?: string | null
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          categoryId?: string
          createdAt?: string | null
          description?: string | null
          name?: string
          parentCategoryId?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MacroCategories_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "MacroCategories_parentCategoryId_fkey"
            columns: ["parentCategoryId"]
            isOneToOne: false
            referencedRelation: "MacroCategories"
            referencedColumns: ["categoryId"]
          },
        ]
      }
      Macros: {
        Row: {
          accountId: string
          categoryId: string | null
          createdAt: string | null
          createdById: string
          description: string | null
          isActive: boolean | null
          isPersonal: boolean | null
          macroId: string
          position: number | null
          title: string
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          categoryId?: string | null
          createdAt?: string | null
          createdById: string
          description?: string | null
          isActive?: boolean | null
          isPersonal?: boolean | null
          macroId?: string
          position?: number | null
          title: string
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          categoryId?: string | null
          createdAt?: string | null
          createdById?: string
          description?: string | null
          isActive?: boolean | null
          isPersonal?: boolean | null
          macroId?: string
          position?: number | null
          title?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Macros_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "Macros_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "MacroCategories"
            referencedColumns: ["categoryId"]
          },
          {
            foreignKeyName: "Macros_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      MacroTicketEvents: {
        Row: {
          appliedAt: string | null
          appliedById: string
          eventId: string
          macroId: string
          ticketId: string
        }
        Insert: {
          appliedAt?: string | null
          appliedById: string
          eventId?: string
          macroId: string
          ticketId: string
        }
        Update: {
          appliedAt?: string | null
          appliedById?: string
          eventId?: string
          macroId?: string
          ticketId?: string
        }
        Relationships: [
          {
            foreignKeyName: "MacroTicketEvents_appliedById_fkey"
            columns: ["appliedById"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "MacroTicketEvents_macroId_fkey"
            columns: ["macroId"]
            isOneToOne: false
            referencedRelation: "Macros"
            referencedColumns: ["macroId"]
          },
          {
            foreignKeyName: "MacroTicketEvents_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
        ]
      }
      MacroUsageStats: {
        Row: {
          lastUsedAt: string | null
          macroId: string
          usageCount: number | null
          userId: string
          weekStartDate: string
        }
        Insert: {
          lastUsedAt?: string | null
          macroId: string
          usageCount?: number | null
          userId: string
          weekStartDate: string
        }
        Update: {
          lastUsedAt?: string | null
          macroId?: string
          usageCount?: number | null
          userId?: string
          weekStartDate?: string
        }
        Relationships: [
          {
            foreignKeyName: "MacroUsageStats_macroId_fkey"
            columns: ["macroId"]
            isOneToOne: false
            referencedRelation: "Macros"
            referencedColumns: ["macroId"]
          },
          {
            foreignKeyName: "MacroUsageStats_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      OrganizationDomains: {
        Row: {
          createdAt: string | null
          domain: string
          organizationId: string
        }
        Insert: {
          createdAt?: string | null
          domain: string
          organizationId: string
        }
        Update: {
          createdAt?: string | null
          domain?: string
          organizationId?: string
        }
        Relationships: [
          {
            foreignKeyName: "OrganizationDomains_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organizations"
            referencedColumns: ["organizationId"]
          },
        ]
      }
      Organizations: {
        Row: {
          accountId: string
          createdAt: string | null
          defaultGroupId: string | null
          description: string | null
          details: string | null
          isShared: boolean | null
          name: string
          notes: string | null
          organizationId: string
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          createdAt?: string | null
          defaultGroupId?: string | null
          description?: string | null
          details?: string | null
          isShared?: boolean | null
          name: string
          notes?: string | null
          organizationId?: string
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          createdAt?: string | null
          defaultGroupId?: string | null
          description?: string | null
          details?: string | null
          isShared?: boolean | null
          name?: string
          notes?: string | null
          organizationId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Organizations_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "Organizations_defaultGroupId_fkey"
            columns: ["defaultGroupId"]
            isOneToOne: false
            referencedRelation: "Groups"
            referencedColumns: ["groupId"]
          },
        ]
      }
      OrganizationTags: {
        Row: {
          createdAt: string | null
          organizationId: string
          tag: string
        }
        Insert: {
          createdAt?: string | null
          organizationId: string
          tag: string
        }
        Update: {
          createdAt?: string | null
          organizationId?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "OrganizationTags_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organizations"
            referencedColumns: ["organizationId"]
          },
        ]
      }
      Permissions: {
        Row: {
          category: string
          createdAt: string | null
          description: string | null
          name: string
          permissionId: string
          updatedAt: string | null
        }
        Insert: {
          category: string
          createdAt?: string | null
          description?: string | null
          name: string
          permissionId?: string
          updatedAt?: string | null
        }
        Update: {
          category?: string
          createdAt?: string | null
          description?: string | null
          name?: string
          permissionId?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      PlanFeatures: {
        Row: {
          accessLevel: string | null
          featureId: string
          planId: string
        }
        Insert: {
          accessLevel?: string | null
          featureId: string
          planId: string
        }
        Update: {
          accessLevel?: string | null
          featureId?: string
          planId?: string
        }
        Relationships: [
          {
            foreignKeyName: "PlanFeatures_featureId_fkey"
            columns: ["featureId"]
            isOneToOne: false
            referencedRelation: "Features"
            referencedColumns: ["featureId"]
          },
          {
            foreignKeyName: "PlanFeatures_planId_fkey"
            columns: ["planId"]
            isOneToOne: false
            referencedRelation: "Plans"
            referencedColumns: ["planId"]
          },
        ]
      }
      Plans: {
        Row: {
          annualSubscriptionPerAgent: number
          createdAt: string | null
          description: string | null
          monthlySubscriptionPerAgent: number
          name: string
          planId: string
          type: string | null
          updatedAt: string | null
        }
        Insert: {
          annualSubscriptionPerAgent: number
          createdAt?: string | null
          description?: string | null
          monthlySubscriptionPerAgent: number
          name: string
          planId?: string
          type?: string | null
          updatedAt?: string | null
        }
        Update: {
          annualSubscriptionPerAgent?: number
          createdAt?: string | null
          description?: string | null
          monthlySubscriptionPerAgent?: number
          name?: string
          planId?: string
          type?: string | null
          updatedAt?: string | null
        }
        Relationships: []
      }
      Products: {
        Row: {
          createdAt: string | null
          description: string | null
          name: string
          productId: string
          updatedAt: string | null
        }
        Insert: {
          createdAt?: string | null
          description?: string | null
          name: string
          productId?: string
          updatedAt?: string | null
        }
        Update: {
          createdAt?: string | null
          description?: string | null
          name?: string
          productId?: string
          updatedAt?: string | null
        }
        Relationships: []
      }
      RolePermissions: {
        Row: {
          permissionId: string
          roleId: string
        }
        Insert: {
          permissionId: string
          roleId: string
        }
        Update: {
          permissionId?: string
          roleId?: string
        }
        Relationships: [
          {
            foreignKeyName: "RolePermissions_permissionId_fkey"
            columns: ["permissionId"]
            isOneToOne: false
            referencedRelation: "Permissions"
            referencedColumns: ["permissionId"]
          },
          {
            foreignKeyName: "RolePermissions_roleId_fkey"
            columns: ["roleId"]
            isOneToOne: false
            referencedRelation: "Roles"
            referencedColumns: ["roleId"]
          },
        ]
      }
      Roles: {
        Row: {
          accountId: string | null
          canConfigureSystem: boolean | null
          canMakePrivateComments: boolean | null
          canMakePublicComments: boolean | null
          canManageAllTickets: boolean | null
          canManageGroups: boolean | null
          canManageOrganizations: boolean | null
          canManageRoles: boolean | null
          canManageUsers: boolean | null
          canViewAllTickets: boolean | null
          canViewReports: boolean | null
          createdAt: string | null
          description: string | null
          isDefault: boolean | null
          isEnterpriseOnly: boolean | null
          isStaffRole: boolean | null
          name: string
          parentRoleId: string | null
          roleCategory: Database["public"]["Enums"]["role_category"]
          roleId: string
          roleType: Database["public"]["Enums"]["role_type"]
          updatedAt: string | null
        }
        Insert: {
          accountId?: string | null
          canConfigureSystem?: boolean | null
          canMakePrivateComments?: boolean | null
          canMakePublicComments?: boolean | null
          canManageAllTickets?: boolean | null
          canManageGroups?: boolean | null
          canManageOrganizations?: boolean | null
          canManageRoles?: boolean | null
          canManageUsers?: boolean | null
          canViewAllTickets?: boolean | null
          canViewReports?: boolean | null
          createdAt?: string | null
          description?: string | null
          isDefault?: boolean | null
          isEnterpriseOnly?: boolean | null
          isStaffRole?: boolean | null
          name: string
          parentRoleId?: string | null
          roleCategory: Database["public"]["Enums"]["role_category"]
          roleId?: string
          roleType: Database["public"]["Enums"]["role_type"]
          updatedAt?: string | null
        }
        Update: {
          accountId?: string | null
          canConfigureSystem?: boolean | null
          canMakePrivateComments?: boolean | null
          canMakePublicComments?: boolean | null
          canManageAllTickets?: boolean | null
          canManageGroups?: boolean | null
          canManageOrganizations?: boolean | null
          canManageRoles?: boolean | null
          canManageUsers?: boolean | null
          canViewAllTickets?: boolean | null
          canViewReports?: boolean | null
          createdAt?: string | null
          description?: string | null
          isDefault?: boolean | null
          isEnterpriseOnly?: boolean | null
          isStaffRole?: boolean | null
          name?: string
          parentRoleId?: string | null
          roleCategory?: Database["public"]["Enums"]["role_category"]
          roleId?: string
          roleType?: Database["public"]["Enums"]["role_type"]
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Roles_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "Roles_parentRoleId_fkey"
            columns: ["parentRoleId"]
            isOneToOne: false
            referencedRelation: "Roles"
            referencedColumns: ["roleId"]
          },
        ]
      }
      TicketArticles: {
        Row: {
          articleId: string
          createdAt: string | null
          createdById: string
          linkType: string
          ticketId: string
        }
        Insert: {
          articleId: string
          createdAt?: string | null
          createdById: string
          linkType: string
          ticketId: string
        }
        Update: {
          articleId?: string
          createdAt?: string | null
          createdById?: string
          linkType?: string
          ticketId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TicketArticles_articleId_fkey"
            columns: ["articleId"]
            isOneToOne: false
            referencedRelation: "KBArticles"
            referencedColumns: ["articleId"]
          },
          {
            foreignKeyName: "TicketArticles_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "TicketArticles_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
        ]
      }
      TicketAttachments: {
        Row: {
          attachmentId: string
          createdAt: string | null
          ticketId: string
        }
        Insert: {
          attachmentId: string
          createdAt?: string | null
          ticketId: string
        }
        Update: {
          attachmentId?: string
          createdAt?: string | null
          ticketId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TicketAttachments_attachmentId_fkey"
            columns: ["attachmentId"]
            isOneToOne: false
            referencedRelation: "Attachments"
            referencedColumns: ["attachmentId"]
          },
          {
            foreignKeyName: "TicketAttachments_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
        ]
      }
      TicketCCs: {
        Row: {
          createdAt: string | null
          ticketId: string
          userId: string
        }
        Insert: {
          createdAt?: string | null
          ticketId: string
          userId: string
        }
        Update: {
          createdAt?: string | null
          ticketId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TicketCCs_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
          {
            foreignKeyName: "TicketCCs_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      TicketComments: {
        Row: {
          authorId: string
          commentId: string
          content: string
          createdAt: string | null
          isPublic: boolean | null
          ticketId: string
          updatedAt: string | null
        }
        Insert: {
          authorId: string
          commentId?: string
          content: string
          createdAt?: string | null
          isPublic?: boolean | null
          ticketId: string
          updatedAt?: string | null
        }
        Update: {
          authorId?: string
          commentId?: string
          content?: string
          createdAt?: string | null
          isPublic?: boolean | null
          ticketId?: string
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "TicketComments_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "TicketComments_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
        ]
      }
      TicketCustomFieldValues: {
        Row: {
          createdAt: string | null
          fieldId: string
          ticketId: string
          updatedAt: string | null
          value: Json
        }
        Insert: {
          createdAt?: string | null
          fieldId: string
          ticketId: string
          updatedAt?: string | null
          value: Json
        }
        Update: {
          createdAt?: string | null
          fieldId?: string
          ticketId?: string
          updatedAt?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "TicketCustomFieldValues_fieldId_fkey"
            columns: ["fieldId"]
            isOneToOne: false
            referencedRelation: "CustomFields"
            referencedColumns: ["fieldId"]
          },
          {
            foreignKeyName: "TicketCustomFieldValues_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
        ]
      }
      TicketFollowers: {
        Row: {
          createdAt: string | null
          ticketId: string
          userId: string
        }
        Insert: {
          createdAt?: string | null
          ticketId: string
          userId: string
        }
        Update: {
          createdAt?: string | null
          ticketId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TicketFollowers_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
          {
            foreignKeyName: "TicketFollowers_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      TicketReadStatus: {
        Row: {
          lastReadAt: string
          ticketId: string
          userId: string
        }
        Insert: {
          lastReadAt?: string
          ticketId: string
          userId: string
        }
        Update: {
          lastReadAt?: string
          ticketId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TicketReadStatus_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
          {
            foreignKeyName: "TicketReadStatus_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      Tickets: {
        Row: {
          accountId: string
          assigneeGroupId: string | null
          assigneeId: string | null
          brandId: string
          channelId: string | null
          closedAt: string | null
          createdAt: string | null
          description: string
          dueDate: string | null
          isPublic: boolean | null
          isShared: boolean | null
          priority: Database["public"]["Enums"]["ticket_priority"] | null
          problemTicketId: string | null
          requesterId: string
          solvedAt: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          submitterId: string
          ticketId: string
          ticketNumber: number
          type: Database["public"]["Enums"]["ticket_type"] | null
          updatedAt: string | null
        }
        Insert: {
          accountId: string
          assigneeGroupId?: string | null
          assigneeId?: string | null
          brandId: string
          channelId?: string | null
          closedAt?: string | null
          createdAt?: string | null
          description: string
          dueDate?: string | null
          isPublic?: boolean | null
          isShared?: boolean | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          problemTicketId?: string | null
          requesterId: string
          solvedAt?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          submitterId: string
          ticketId?: string
          ticketNumber: number
          type?: Database["public"]["Enums"]["ticket_type"] | null
          updatedAt?: string | null
        }
        Update: {
          accountId?: string
          assigneeGroupId?: string | null
          assigneeId?: string | null
          brandId?: string
          channelId?: string | null
          closedAt?: string | null
          createdAt?: string | null
          description?: string
          dueDate?: string | null
          isPublic?: boolean | null
          isShared?: boolean | null
          priority?: Database["public"]["Enums"]["ticket_priority"] | null
          problemTicketId?: string | null
          requesterId?: string
          solvedAt?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          submitterId?: string
          ticketId?: string
          ticketNumber?: number
          type?: Database["public"]["Enums"]["ticket_type"] | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Tickets_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "Tickets_assigneeGroupId_fkey"
            columns: ["assigneeGroupId"]
            isOneToOne: false
            referencedRelation: "Groups"
            referencedColumns: ["groupId"]
          },
          {
            foreignKeyName: "Tickets_assigneeId_fkey"
            columns: ["assigneeId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "Tickets_brandId_fkey"
            columns: ["brandId"]
            isOneToOne: false
            referencedRelation: "Brands"
            referencedColumns: ["brandId"]
          },
          {
            foreignKeyName: "Tickets_channelId_fkey"
            columns: ["channelId"]
            isOneToOne: false
            referencedRelation: "Channels"
            referencedColumns: ["channelId"]
          },
          {
            foreignKeyName: "Tickets_problemTicketId_fkey"
            columns: ["problemTicketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
          {
            foreignKeyName: "Tickets_requesterId_fkey"
            columns: ["requesterId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
          {
            foreignKeyName: "Tickets_submitterId_fkey"
            columns: ["submitterId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      TicketSequences: {
        Row: {
          accountId: string
          lastNumber: number
        }
        Insert: {
          accountId: string
          lastNumber?: number
        }
        Update: {
          accountId?: string
          lastNumber?: number
        }
        Relationships: [
          {
            foreignKeyName: "TicketSequences_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: true
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
        ]
      }
      TicketSharing: {
        Row: {
          createdAt: string | null
          sharedAccountId: string
          ticketId: string
        }
        Insert: {
          createdAt?: string | null
          sharedAccountId: string
          ticketId: string
        }
        Update: {
          createdAt?: string | null
          sharedAccountId?: string
          ticketId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TicketSharing_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
        ]
      }
      TicketTags: {
        Row: {
          createdAt: string | null
          tag: string
          ticketId: string
        }
        Insert: {
          createdAt?: string | null
          tag: string
          ticketId: string
        }
        Update: {
          createdAt?: string | null
          tag?: string
          ticketId?: string
        }
        Relationships: [
          {
            foreignKeyName: "TicketTags_ticketId_fkey"
            columns: ["ticketId"]
            isOneToOne: false
            referencedRelation: "Tickets"
            referencedColumns: ["ticketId"]
          },
        ]
      }
      UserGroups: {
        Row: {
          createdAt: string | null
          groupId: string
          isDefault: boolean | null
          updatedAt: string | null
          userId: string
        }
        Insert: {
          createdAt?: string | null
          groupId: string
          isDefault?: boolean | null
          updatedAt?: string | null
          userId: string
        }
        Update: {
          createdAt?: string | null
          groupId?: string
          isDefault?: boolean | null
          updatedAt?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserGroups_groupId_fkey"
            columns: ["groupId"]
            isOneToOne: false
            referencedRelation: "Groups"
            referencedColumns: ["groupId"]
          },
          {
            foreignKeyName: "UserGroups_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
      UserProfiles: {
        Row: {
          accountId: string | null
          createdAt: string | null
          isActive: boolean | null
          isEmailVerified: boolean | null
          isSuspended: boolean | null
          lastLoginAt: string | null
          name: string
          organizationId: string | null
          roleId: string | null
          updatedAt: string | null
          userId: string
          userType: string
        }
        Insert: {
          accountId?: string | null
          createdAt?: string | null
          isActive?: boolean | null
          isEmailVerified?: boolean | null
          isSuspended?: boolean | null
          lastLoginAt?: string | null
          name: string
          organizationId?: string | null
          roleId?: string | null
          updatedAt?: string | null
          userId: string
          userType: string
        }
        Update: {
          accountId?: string | null
          createdAt?: string | null
          isActive?: boolean | null
          isEmailVerified?: boolean | null
          isSuspended?: boolean | null
          lastLoginAt?: string | null
          name?: string
          organizationId?: string | null
          roleId?: string | null
          updatedAt?: string | null
          userId?: string
          userType?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserProfiles_accountId_fkey"
            columns: ["accountId"]
            isOneToOne: false
            referencedRelation: "Accounts"
            referencedColumns: ["accountId"]
          },
          {
            foreignKeyName: "UserProfiles_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organizations"
            referencedColumns: ["organizationId"]
          },
          {
            foreignKeyName: "UserProfiles_roleId_fkey"
            columns: ["roleId"]
            isOneToOne: false
            referencedRelation: "Roles"
            referencedColumns: ["roleId"]
          },
        ]
      }
      UserTags: {
        Row: {
          createdAt: string | null
          tag: string
          userId: string
        }
        Insert: {
          createdAt?: string | null
          tag: string
          userId: string
        }
        Update: {
          createdAt?: string | null
          tag?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserTags_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "UserProfiles"
            referencedColumns: ["userId"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_section_depth: {
        Args: {
          section_id: string
          parent_id: string
        }
        Returns: boolean
      }
      get_next_ticket_number: {
        Args: {
          account_id: string
        }
        Returns: number
      }
      validate_domains: {
        Args: {
          domains: string[]
        }
        Returns: boolean
      }
    }
    Enums: {
      article_state: "draft" | "published" | "archived"
      audit_action: "create" | "update" | "delete"
      audit_entity_type:
        | "ticket"
        | "comment"
        | "attachment"
        | "custom_field_value"
        | "follower"
        | "cc"
        | "tag"
        | "macro"
      channel_type:
        | "email"
        | "help_center"
        | "web_messaging"
        | "mobile_messaging"
        | "whatsapp"
        | "line"
        | "facebook"
        | "facebook_messenger"
        | "twitter"
        | "twitter_dm"
        | "instagram_direct"
        | "wechat"
        | "voice"
        | "text"
        | "live_chat"
        | "web_widget"
        | "mobile_sdk"
        | "api"
        | "cti"
        | "closed_ticket"
      content_locale: "en-US" | "es" | "fr" | "de" | "it" | "pt-BR" | "ja"
      end_user_account_creation_type: "submit_ticket" | "sign_up"
      role_category: "end_user" | "agent" | "admin" | "owner"
      role_type: "system" | "custom" | "light" | "contributor"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status:
        | "new"
        | "open"
        | "pending"
        | "on_hold"
        | "solved"
        | "closed"
      ticket_type: "question" | "incident" | "problem" | "task"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
