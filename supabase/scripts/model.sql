-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Role Types Enum
CREATE TYPE "role_type" AS ENUM ('system', 'custom', 'light', 'contributor');

-- Create Role Category Enum
CREATE TYPE "role_category" AS ENUM ('end_user', 'agent', 'admin', 'owner');

-- Create End User Account Creation Type Enum
CREATE TYPE "end_user_account_creation_type" AS ENUM ('submit_ticket', 'sign_up');

-- Create Plans Table first (no dependencies)
CREATE TABLE "Plans" (
    "planId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(50) CHECK ("type" IN ('suite', 'buildYourOwn')),
    "monthlySubscriptionPerAgent" DECIMAL(10, 2) NOT NULL,
    "annualSubscriptionPerAgent" DECIMAL(10, 2) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Plans table
ALTER TABLE "Plans" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for Plans - anyone can read
CREATE POLICY "Anyone can read plans"
ON "Plans" FOR SELECT
TO public, anon
USING (true);

-- Create Accounts Table second (depends only on Plans)
CREATE TABLE "Accounts" (
    "accountId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "subdomain" VARCHAR(255) UNIQUE NOT NULL,
    "favicon" VARCHAR(255),
    "planId" UUID REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "endUserAccountCreationType" end_user_account_creation_type NOT NULL DEFAULT 'submit_ticket',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Create Roles Table third (now Accounts exists)
CREATE TABLE "Roles" (
    "roleId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "roleType" role_type NOT NULL,
    "roleCategory" role_category NOT NULL,
    "isEnterpriseOnly" BOOLEAN DEFAULT FALSE,
    "isStaffRole" BOOLEAN DEFAULT TRUE,
    "parentRoleId" UUID REFERENCES "Roles"("roleId"),
    "canViewAllTickets" BOOLEAN DEFAULT FALSE,
    "canManageAllTickets" BOOLEAN DEFAULT FALSE,
    "canConfigureSystem" BOOLEAN DEFAULT FALSE,
    "canManageUsers" BOOLEAN DEFAULT FALSE,
    "canManageRoles" BOOLEAN DEFAULT FALSE,
    "canViewReports" BOOLEAN DEFAULT FALSE,
    "canManageGroups" BOOLEAN DEFAULT FALSE,
    "canManageOrganizations" BOOLEAN DEFAULT FALSE,
    "canMakePrivateComments" BOOLEAN DEFAULT TRUE,
    "canMakePublicComments" BOOLEAN DEFAULT FALSE,
    "isDefault" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "valid_parent_role" CHECK (
        ("parentRoleId" IS NULL) OR 
        ("parentRoleId" != "roleId")
    )
);


-- Create Groups Table (depends on Accounts)
CREATE TABLE "Groups" (
    "groupId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isPrivate" BOOLEAN DEFAULT FALSE,
    "solvedTicketReassignmentStrategy" VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Add defaultGroupId to Accounts table (after Groups table creation)
ALTER TABLE "Accounts"
ADD COLUMN "defaultGroupId" UUID REFERENCES "Groups"("groupId") ON DELETE SET NULL;

-- Create Organizations Table (depends on Groups and Accounts)
CREATE TABLE "Organizations" (
    "organizationId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "details" TEXT,
    "isShared" BOOLEAN DEFAULT FALSE,
    "defaultGroupId" UUID REFERENCES "Groups"("groupId") ON DELETE SET NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Organizations
-- ALTER TABLE "Organizations" ENABLE ROW LEVEL SECURITY;

-- Create UserProfile Table that extends auth.users
CREATE TABLE "UserProfiles" (
    "userId" UUID PRIMARY KEY REFERENCES auth.users(id),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userType" VARCHAR(50) NOT NULL CHECK ("userType" IN ('staff', 'end_user')),
    "roleId" UUID REFERENCES "Roles"("roleId"),
    "accountId" UUID REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "organizationId" UUID REFERENCES "Organizations"("organizationId"),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "status" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "unique_email_per_account" UNIQUE("userId", "accountId")
);


-- Enable RLS for Groups
ALTER TABLE "Groups" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Staff can view groups in their account
CREATE POLICY "Staff can view groups in their account"
ON "Groups" FOR SELECT
TO authenticated
USING (
    -- Staff can view groups in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = "Groups"."accountId"
    )
);

-- Create INSERT policy - Only admin staff can create groups in their account
CREATE POLICY "Admin staff can create groups in their account"
ON "Groups" FOR INSERT
TO authenticated
WITH CHECK (
    -- Admin staff can create groups in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Groups"."accountId"
    )
);

-- Create UPDATE policy - Only admin staff can update groups in their account
CREATE POLICY "Admin staff can update groups in their account"
ON "Groups" FOR UPDATE
TO authenticated
USING (
    -- Admin staff can update groups in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Groups"."accountId"
    )
)
WITH CHECK (
    -- Admin staff can update groups in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Groups"."accountId"
    )
);

-- Create DELETE policy - Only admin staff can delete groups in their account
CREATE POLICY "Admin staff can delete groups in their account"
ON "Groups" FOR DELETE
TO authenticated
USING (
    -- Admin staff can delete groups in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Groups"."accountId"
    )
);

-- Enable RLS for Roles
ALTER TABLE "Roles" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Only staff can view roles in their account
CREATE POLICY "Staff can view roles in their account"
ON "Roles" FOR SELECT
TO authenticated
USING (
    -- Staff can view roles in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = "Roles"."accountId"
    )
);

-- Create INSERT policy - Only admin staff can create roles in their account
CREATE POLICY "Admin staff can create roles in their account"
ON "Roles" FOR INSERT
TO authenticated
WITH CHECK (
    -- Admin staff can create roles in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Roles"."accountId"
    )
);

-- Create UPDATE policy - Only admin staff can update roles in their account
CREATE POLICY "Admin staff can update roles in their account"
ON "Roles" FOR UPDATE
TO authenticated
USING (
    -- Admin staff can update roles in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Roles"."accountId"
    )
)
WITH CHECK (
    -- Admin staff can update roles in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Roles"."accountId"
    )
);

-- Create DELETE policy - Only admin staff can delete roles in their account
CREATE POLICY "Admin staff can delete roles in their account"
ON "Roles" FOR DELETE
TO authenticated
USING (
    -- Admin staff can delete roles in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Roles"."accountId"
    )
);
-- Enable RLS for Accounts
ALTER TABLE "Accounts" ENABLE ROW LEVEL SECURITY;

-- First revoke all privileges from public and authenticated
REVOKE ALL ON "Accounts" FROM public, authenticated, anon;

-- Grant basic read access to specific columns for both public and authenticated users
GRANT SELECT ("accountId", "name", "subdomain", "favicon", "endUserAccountCreationType") 
ON "Accounts" TO public, authenticated, anon;

-- Create public read policy for basic account info
CREATE POLICY "Public can view basic account info"
ON "Accounts" FOR SELECT
TO public, authenticated, anon
USING (true);

-- Drop the security definer function as it's no longer needed
DROP FUNCTION IF EXISTS get_account_info;

-- Update Accounts to reference owner
ALTER TABLE "Accounts"
ADD COLUMN "ownerId" UUID REFERENCES "UserProfiles"("userId") ON DELETE SET NULL;

-- Enable RLS for UserProfiles
ALTER TABLE "UserProfiles" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Users can view their own profile or staff can view profiles in their account
CREATE POLICY "Users can view their own profile or staff can view profiles in their account"
ON "UserProfiles" FOR SELECT
TO authenticated
USING (
    auth.uid() = "userId" -- User can view their own profile
);


-- Create INSERT policy - Users can create their own profile or admins can create profiles in their account
CREATE POLICY "Users can create their own profile or admins can create profiles in their account"
ON "UserProfiles" FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = "userId" -- User can create their own profile
    OR (
        -- Admins can create profiles in their account
        EXISTS (
            SELECT 1 FROM "UserProfiles" creator
            JOIN "Roles" r ON creator."roleId" = r."roleId"
            WHERE creator."userId" = auth.uid()
            AND creator."accountId" = "UserProfiles"."accountId"
            AND r."roleCategory" = 'admin'
        )
    )
);

-- Create UPDATE policy - Users can update their own profile or admins can update profiles in their account
CREATE POLICY "Users can update their own profile or admins can update profiles in their account"
ON "UserProfiles" FOR UPDATE
TO authenticated
USING (
    auth.uid() = "userId" -- User can update their own profile
    OR (
        -- Admins can update profiles in their account
        (auth.jwt()->'user_metadata'->>'userType')::text = 'staff'
        AND (auth.jwt()->'user_metadata'->>'roleCategory')::text = 'admin'
        AND (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
    )
)
WITH CHECK (
    auth.uid() = "userId" -- User can update their own profile
    OR (
        -- Admins can update profiles in their account
        (auth.jwt()->'user_metadata'->>'userType')::text = 'staff'
        AND (auth.jwt()->'user_metadata'->>'roleCategory')::text = 'admin'
        AND (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
    )
);

-- Create DELETE policy - Only admins can delete profiles in their account
CREATE POLICY "Only admins can delete profiles in their account"
ON "UserProfiles" FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" deleter
        JOIN "Roles" r ON deleter."roleId" = r."roleId"
        WHERE deleter."userId" = auth.uid()
        AND deleter."accountId" = "UserProfiles"."accountId"
        AND r."roleCategory" = 'admin'
    )
);

-- Create indexes for UserProfiles
CREATE INDEX idxUserEmail ON "UserProfiles"("userId");
CREATE INDEX idxUserRole ON "UserProfiles"("roleId");
CREATE INDEX idxUserOrg ON "UserProfiles"("organizationId");
CREATE INDEX idxUserAccount ON "UserProfiles"("accountId");

-- Now we can create all the policies that reference UserProfiles

-- Create Products Table
CREATE TABLE "Products" (
    "productId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Products
-- ALTER TABLE "Products" ENABLE ROW LEVEL SECURITY;

-- Create Features Table
CREATE TABLE "Features" (
    "featureId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isAddOn" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Features

-- Create Plan_Features Join Table
CREATE TABLE "PlanFeatures" (
    "planId" UUID REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "featureId" UUID REFERENCES "Features"("featureId") ON DELETE CASCADE,
    "accessLevel" VARCHAR(512),
    PRIMARY KEY ("planId", "featureId")
);

-- Enable RLS for PlanFeatures
-- ALTER TABLE "PlanFeatures" ENABLE ROW LEVEL SECURITY;


CREATE INDEX idxFeatureId ON "PlanFeatures"("featureId");

-- Create Add_ons Table
CREATE TABLE "AddOns" (
    "addOnId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "pricingModel" VARCHAR(255),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for AddOns
ALTER TABLE "AddOns" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for AddOns - anyone can read
CREATE POLICY "Anyone can read add-ons"
ON "AddOns" FOR SELECT
TO public
USING (true);

-- Create AccountAddOns Junction Table
CREATE TABLE "AccountAddOns" (
    "accountId" UUID REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "addOnId" UUID REFERENCES "AddOns"("addOnId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("accountId", "addOnId")
);

-- Enable RLS for AccountAddOns
-- ALTER TABLE "AccountAddOns" ENABLE ROW LEVEL SECURITY;

-- Create index for optimization
CREATE INDEX idx_account_addons_addon ON "AccountAddOns"("addOnId");
CREATE INDEX idx_account_addons_account ON "AccountAddOns"("accountId");

-- Create Brands Table
CREATE TABLE "Brands" (
    "brandId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "subdomain" VARCHAR(255) NOT NULL,
    "logo" VARCHAR(255),
    "hostMapping" VARCHAR(255),
    "brandSignature" TEXT,
    "isDefault" BOOLEAN DEFAULT FALSE,
    "isAgentBrand" BOOLEAN DEFAULT FALSE,
    "isActive" BOOLEAN DEFAULT TRUE,
    "sslCertificate" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("subdomain"),
    UNIQUE("hostMapping")
);

-- Create index for brand lookups
CREATE INDEX idx_brands_account ON "Brands"("accountId");

-- Create BrandAgents junction table for brand membership
CREATE TABLE "BrandAgents" (
    "brandId" UUID REFERENCES "Brands"("brandId") ON DELETE CASCADE,
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("brandId", "userId")
);


-- Create GroupOrganizationMapping Table
CREATE TABLE "GroupOrganizationMapping" (
    "groupId" UUID REFERENCES "Groups"("groupId") ON DELETE CASCADE,
    "organizationId" UUID REFERENCES "Organizations"("organizationId") ON DELETE CASCADE,
    PRIMARY KEY ("groupId", "organizationId")
);

-- Create indexes for optimization
CREATE INDEX idxOrgName ON "Organizations"("name");
CREATE INDEX idxGroupName ON "Groups"("name");
CREATE INDEX idxOrgDefaultGroup ON "Organizations"("defaultGroupId");
CREATE INDEX idxOrgAccount ON "Organizations"("accountId");
CREATE INDEX idxGroupAccount ON "Groups"("accountId");

-- Create Permissions Table
CREATE TABLE "Permissions" (
    "permissionId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL, -- e.g., 'tickets', 'users', 'system', 'reporting'
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create RolePermissions Join Table
CREATE TABLE "RolePermissions" (
    "roleId" UUID REFERENCES "Roles"("roleId") ON DELETE CASCADE,
    "permissionId" UUID REFERENCES "Permissions"("permissionId") ON DELETE CASCADE,
    PRIMARY KEY ("roleId", "permissionId")
);


-- Create domain validation function
CREATE OR REPLACE FUNCTION validate_domains(domains TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if any domain in the array doesn't match the pattern
    RETURN NOT EXISTS (
        SELECT 1
        FROM unnest(domains) domain
        WHERE domain !~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$'
    );
END;
$$ LANGUAGE plpgsql;

-- Create OrganizationDomains Table
CREATE TABLE "OrganizationDomains" (
    "organizationId" UUID REFERENCES "Organizations"("organizationId") ON DELETE CASCADE,
    "domain" VARCHAR(255) NOT NULL CHECK ("domain" ~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$'),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("organizationId", "domain")
);


-- Create indexes for optimization
CREATE INDEX idx_org_domains ON "OrganizationDomains"("domain");

-- -- Create UserGroups Join Table for handling multiple group assignments
CREATE TABLE "UserGroups" (
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "groupId" UUID REFERENCES "Groups"("groupId") ON DELETE CASCADE,
    "isDefault" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "groupId")
);

-- Create function to prevent circular organization-group mappings
CREATE OR REPLACE FUNCTION check_circular_org_group_mapping()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this mapping would create a circular reference through defaultGroupId
    IF EXISTS (
        SELECT 1
        FROM "Organizations" o
        WHERE o."organizationId" = NEW."organizationId"
        AND o."defaultGroupId" = NEW."groupId"
    ) THEN
        RAISE EXCEPTION 'Circular reference detected: Cannot map organization to its default group';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for preventing circular mappings
CREATE TRIGGER prevent_circular_mappings
    BEFORE INSERT OR UPDATE ON "GroupOrganizationMapping"
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_org_group_mapping();

-- Create Ticket Status ENUM
CREATE TYPE ticket_status AS ENUM ('new', 'open', 'pending', 'on_hold', 'solved', 'closed');

-- Create Ticket Type ENUM
CREATE TYPE ticket_type AS ENUM ('question', 'incident', 'problem', 'task');

-- Create Ticket Priority ENUM
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

-- Create Tickets Table
CREATE TABLE "Tickets" (
    "ticketId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "brandId" UUID NOT NULL REFERENCES "Brands"("brandId") ON DELETE CASCADE,
    "requesterId" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "submitterId" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "assigneeId" UUID REFERENCES "UserProfiles"("userId") ON DELETE SET NULL,
    "assigneeGroupId" UUID REFERENCES "Groups"("groupId") ON DELETE SET NULL,
    "subject" VARCHAR(150) NOT NULL,
    "description" TEXT NOT NULL,
    "status" ticket_status NOT NULL DEFAULT 'new',
    "type" ticket_type,
    "priority" ticket_priority,
    "dueDate" TIMESTAMP,  -- For tasks
    "isShared" BOOLEAN DEFAULT FALSE,
    "isPublic" BOOLEAN DEFAULT TRUE,
    "problemTicketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE SET NULL,  -- For incident tickets linking to problem tickets
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "solvedAt" TIMESTAMP,
    "closedAt" TIMESTAMP,
    CONSTRAINT valid_assignee CHECK (
        ("assigneeId" IS NULL AND "assigneeGroupId" IS NOT NULL) OR
        ("assigneeId" IS NOT NULL AND "assigneeGroupId" IS NULL) OR
        ("assigneeId" IS NULL AND "assigneeGroupId" IS NULL)
    ),
    CONSTRAINT valid_problem_ticket CHECK (
        ("type" = 'incident' AND "problemTicketId" IS NOT NULL) OR
        ("type" != 'incident' AND "problemTicketId" IS NULL)
    ),
    "ticketNumber" BIGINT NOT NULL,
    CONSTRAINT "unique_ticket_number_per_account" UNIQUE ("accountId", "ticketNumber")
);

-- Create CustomFields Table to define custom ticket fields
CREATE TABLE "CustomFields" (
    "fieldId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "fieldType" VARCHAR(50) NOT NULL CHECK (
        "fieldType" IN (
            'text',
            'number',
            'decimal',
            'date',
            'datetime',
            'boolean',
            'dropdown',
            'multiselect',
            'checkbox',
            'radio',
            'regex'
        )
    ),
    "isRequired" BOOLEAN DEFAULT FALSE,
    "isActive" BOOLEAN DEFAULT TRUE,
    "defaultValue" TEXT,
    "options" JSONB, -- For dropdown/multiselect fields: {"options": ["value1", "value2", ...]}
    "validationRules" JSONB, -- For validation: {"min": 0, "max": 100, "pattern": "^[A-Z]+$", etc}
    "position" INTEGER, -- For ordering fields in forms
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("accountId", "name")
);

-- Create TicketCustomFieldValues Table to store values
CREATE TABLE "TicketCustomFieldValues" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "fieldId" UUID REFERENCES "CustomFields"("fieldId") ON DELETE CASCADE,
    "value" JSONB NOT NULL, -- Stores the actual value in a flexible format
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ticketId", "fieldId")
);

-- Create Tags Table
CREATE TABLE "Tags" (
    "tagId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "tagType" VARCHAR(20) CHECK ("tagType" IN ('user', 'organization', 'group')),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("accountId", "name")
);

-- Create index for tag lookups
CREATE INDEX idx_tags_account ON "Tags"("accountId");
CREATE INDEX idx_tags_name ON "Tags"("name");

-- Modify TicketTags table to use tagId
DROP TABLE IF EXISTS "TicketTags";
CREATE TABLE "TicketTags" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "tagId" UUID REFERENCES "Tags"("tagId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ticketId", "tagId")
);

-- Create indexes for custom fields
CREATE INDEX idx_custom_fields_account ON "CustomFields"("accountId");
CREATE INDEX idx_custom_field_values_field ON "TicketCustomFieldValues"("fieldId");


-- Create Comments Table
CREATE TABLE "TicketComments" (
    "commentId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketId" UUID NOT NULL REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "authorId" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Attachments Table
CREATE TABLE "Attachments" (
    "attachmentId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "fileName" VARCHAR(255) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    "storageKey" TEXT NOT NULL, -- Path/key in object storage
    "uploadedById" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "isPublic" BOOLEAN DEFAULT TRUE,
    "thumbnailStorageKey" TEXT, -- For image attachments
    "metadata" JSONB, -- Additional metadata like dimensions for images, duration for audio/video
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create TicketAttachments Junction Table
CREATE TABLE "TicketAttachments" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "attachmentId" UUID REFERENCES "Attachments"("attachmentId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ticketId", "attachmentId")
);

-- Create CommentAttachments Junction Table
CREATE TABLE "CommentAttachments" (
    "commentId" UUID REFERENCES "TicketComments"("commentId") ON DELETE CASCADE,
    "attachmentId" UUID REFERENCES "Attachments"("attachmentId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("commentId", "attachmentId")
);

-- Create indexes for attachment lookups
CREATE INDEX idx_attachments_account ON "Attachments"("accountId");
CREATE INDEX idx_attachments_uploaded_by ON "Attachments"("uploadedById");
CREATE INDEX idx_ticket_attachments_ticket ON "TicketAttachments"("ticketId");
CREATE INDEX idx_comment_attachments_comment ON "CommentAttachments"("commentId");

-- Create TicketFollowers Junction Table
CREATE TABLE "TicketFollowers" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ticketId", "userId")
);

-- Create TicketCCs Junction Table
CREATE TABLE "TicketCCs" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ticketId", "userId")
);


-- Create TicketSharing Junction Table
CREATE TABLE "TicketSharing" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "sharedAccountId" UUID NOT NULL,  -- External Zendesk account ID
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ticketId", "sharedAccountId")
);

-- Create indexes for common lookups
CREATE INDEX idx_tickets_requester ON "Tickets"("requesterId");
CREATE INDEX idx_tickets_assignee ON "Tickets"("assigneeId");
CREATE INDEX idx_tickets_group ON "Tickets"("assigneeGroupId");
CREATE INDEX idx_tickets_brand ON "Tickets"("brandId");
CREATE INDEX idx_tickets_status ON "Tickets"("status");
CREATE INDEX idx_tickets_type ON "Tickets"("type");
CREATE INDEX idx_comments_ticket ON "TicketComments"("ticketId");
CREATE INDEX idx_ticket_tags ON "TicketTags"("ticketId");

-- Enable RLS for all ticket-related tables
ALTER TABLE "Tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketComments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketFollowers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketCCs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketTags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketSharing" ENABLE ROW LEVEL SECURITY;


-- Function to update ticket timestamps
CREATE OR REPLACE FUNCTION update_ticket_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updatedAt timestamp
    NEW."updatedAt" := CURRENT_TIMESTAMP;
    
    -- Set solvedAt if status changed to solved
    IF NEW."status" = 'solved' AND OLD."status" != 'solved' THEN
        NEW."solvedAt" := CURRENT_TIMESTAMP;
    END IF;
    
    -- Set closedAt if status changed to closed
    IF NEW."status" = 'closed' AND OLD."status" != 'closed' THEN
        NEW."closedAt" := CURRENT_TIMESTAMP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp updates
CREATE TRIGGER update_ticket_timestamps
    BEFORE UPDATE ON "Tickets"
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_timestamps();

-- Create TicketReadStatus table to track when users last read tickets
CREATE TABLE "TicketReadStatus" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "lastReadAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ticketId", "userId")
);

-- Create CommentReadStatus table to track which comments users have read
CREATE TABLE "CommentReadStatus" (
    "commentId" UUID REFERENCES "TicketComments"("commentId") ON DELETE CASCADE,
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "readAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("commentId", "userId")
);

-- Create indexes for efficient querying
CREATE INDEX idx_ticket_read_status_user ON "TicketReadStatus"("userId");
CREATE INDEX idx_comment_read_status_user ON "CommentReadStatus"("userId");


-- Create Channel Type ENUM
CREATE TYPE channel_type AS ENUM (
    'email',
    'help_center',
    'web_messaging',
    'mobile_messaging',
    'whatsapp',
    'line',
    'facebook',
    'facebook_messenger',
    'twitter',
    'twitter_dm',
    'instagram_direct',
    'wechat',
    'voice',
    'text',
    'live_chat',
    'web_widget',
    'mobile_sdk',
    'api',
    'cti',
    'closed_ticket'
);

-- Create Channels Table
CREATE TABLE "Channels" (
    "channelId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "brandId" UUID REFERENCES "Brands"("brandId") ON DELETE CASCADE,
    "type" channel_type NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN DEFAULT TRUE,
    "configuration" JSONB,  -- Flexible configuration storage for different channel types
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("accountId", "type", "brandId")  -- One channel type per brand per account
);

-- Enable RLS for Channels
ALTER TABLE "Channels" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Staff can view channels in their account
CREATE POLICY "Staff can view channels in their account"
ON "Channels" FOR SELECT
TO authenticated
USING (
    -- Staff can view channels in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = "Channels"."accountId"
    )
);

-- Create INSERT policy - Only admin staff can create channels in their account
CREATE POLICY "Admin staff can create channels in their account"
ON "Channels" FOR INSERT
TO authenticated
WITH CHECK (
    -- Admin staff can create channels in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Channels"."accountId"
    )
);

-- Create UPDATE policy - Only admin staff can update channels in their account
CREATE POLICY "Admin staff can update channels in their account"
ON "Channels" FOR UPDATE
TO authenticated
USING (
    -- Admin staff can update channels in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Channels"."accountId"
    )
)
WITH CHECK (
    -- Admin staff can update channels in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Channels"."accountId"
    )
);

-- Create DELETE policy - Only admin staff can delete channels in their account
CREATE POLICY "Admin staff can delete channels in their account"
ON "Channels" FOR DELETE
TO authenticated
USING (
    -- Admin staff can delete channels in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Channels"."accountId"
    )
);

-- Create ChannelInbox Table for email channels
CREATE TABLE "ChannelInbox" (
    "channelId" UUID REFERENCES "Channels"("channelId") ON DELETE CASCADE,
    "email" VARCHAR(255) NOT NULL,
    "forwardingAddress" VARCHAR(255),
    "customDomain" VARCHAR(255),
    "signature" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("channelId"),
    CONSTRAINT valid_email CHECK ("email" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create ChannelVoice Table for voice/phone channels
CREATE TABLE "ChannelVoice" (
    "channelId" UUID REFERENCES "Channels"("channelId") ON DELETE CASCADE,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "greeting" TEXT,
    "voicemailGreeting" TEXT,
    "recordCalls" BOOLEAN DEFAULT TRUE,
    "transcribeVoicemail" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("channelId")
);

-- Create ChannelMessaging Table for messaging channels (WhatsApp, FB Messenger, etc)
CREATE TABLE "ChannelMessaging" (
    "channelId" UUID REFERENCES "Channels"("channelId") ON DELETE CASCADE,
    "providerAccountId" VARCHAR(255) NOT NULL,  -- External account ID (e.g., WhatsApp Business ID)
    "providerPhoneNumber" VARCHAR(20),  -- For channels that use phone numbers
    "providerUsername" VARCHAR(255),    -- For channels that use usernames
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("channelId")
);

-- Add channel field to Tickets table
ALTER TABLE "Tickets"
ADD COLUMN "channelId" UUID REFERENCES "Channels"("channelId") ON DELETE SET NULL;

-- Create index for channel lookups
CREATE INDEX idx_channels_account ON "Channels"("accountId");
CREATE INDEX idx_channels_brand ON "Channels"("brandId");
CREATE INDEX idx_tickets_channel ON "Tickets"("channelId");



-- -- Create AutomaticTagRules Table for keyword-based tagging
-- CREATE TABLE "AutomaticTagRules" (
--     "ruleId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
--     "name" VARCHAR(255) NOT NULL,
--     "description" TEXT,
--     "keyword" VARCHAR(255) NOT NULL,
--     "tag" VARCHAR(100) NOT NULL,
--     "isActive" BOOLEAN DEFAULT TRUE,
--     "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- -- Create indexes for tag-based searching
-- CREATE INDEX idx_auto_tag_rules_account ON "AutomaticTagRules"("accountId");
-- CREATE INDEX idx_auto_tag_rules_keyword ON "AutomaticTagRules"("keyword");

-- -- -- Create trigger to propagate tags when ticket is created
-- CREATE TRIGGER propagate_tags_on_ticket_creation
--     AFTER INSERT ON "Tickets"
--     FOR EACH ROW
--     EXECUTE FUNCTION propagate_tags_to_ticket();

-- -- Create function to apply automatic tag rules
-- CREATE OR REPLACE FUNCTION apply_automatic_tag_rules()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     -- Add tags based on automatic tag rules that match the ticket description
--     INSERT INTO "TicketTags" ("ticketId", "tag")
--     SELECT NEW."ticketId", atr."tag"
--     FROM "AutomaticTagRules" atr
--     WHERE atr."accountId" = NEW."accountId"
--     AND atr."isActive" = true
--     AND NEW."description" ILIKE '%' || atr."keyword" || '%'
--     ON CONFLICT DO NOTHING;

--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Create trigger to apply automatic tag rules when ticket is created or updated
-- CREATE TRIGGER apply_automatic_tag_rules_on_ticket
--     AFTER INSERT OR UPDATE OF "description" ON "Tickets"
--     FOR EACH ROW
--     EXECUTE FUNCTION apply_automatic_tag_rules();

-- -- Create MacroCategories Table
CREATE TABLE "MacroCategories" (
    "categoryId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "parentCategoryId" UUID REFERENCES "MacroCategories"("categoryId"),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "valid_parent_category" CHECK (
        ("parentCategoryId" IS NULL) OR 
        ("parentCategoryId" != "categoryId")
    )
);

-- Create Macros Table
CREATE TABLE "Macros" (
    "macroId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "categoryId" UUID REFERENCES "MacroCategories"("categoryId") ON DELETE SET NULL,
    "createdById" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isPersonal" BOOLEAN DEFAULT FALSE,
    "isActive" BOOLEAN DEFAULT TRUE,
    "position" INTEGER,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create MacroActions Table to store individual actions within a macro
CREATE TABLE "MacroActions" (
    "actionId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "macroId" UUID NOT NULL REFERENCES "Macros"("macroId") ON DELETE CASCADE,
    "actionType" VARCHAR(50) NOT NULL CHECK (
        "actionType" IN (
            'update_field',
            'add_comment',
            'add_internal_note',
            'add_attachment',
            'remove_tags',
            'add_tags'
        )
    ),
    "field" VARCHAR(100), -- For update_field actions
    "value" TEXT,         -- The new value or comment text
    "position" INTEGER NOT NULL, -- Order of actions within the macro
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create MacroUsageStats Table to track macro usage for "most used" functionality
CREATE TABLE "MacroUsageStats" (
    "macroId" UUID NOT NULL REFERENCES "Macros"("macroId") ON DELETE CASCADE,
    "userId" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "usageCount" INTEGER DEFAULT 0,
    "lastUsedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "weekStartDate" DATE NOT NULL, -- To track weekly usage
    PRIMARY KEY ("macroId", "userId", "weekStartDate")
);

-- Create indexes for common lookups
CREATE INDEX idx_macros_account ON "Macros"("accountId");
CREATE INDEX idx_macros_category ON "Macros"("categoryId");
CREATE INDEX idx_macro_actions_macro ON "MacroActions"("macroId");
CREATE INDEX idx_macro_usage_user_date ON "MacroUsageStats"("userId", "weekStartDate");


-- Function to update macro usage statistics
CREATE OR REPLACE FUNCTION update_macro_usage()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "MacroUsageStats" (
        "macroId",
        "userId",
        "usageCount",
        "lastUsedAt",
        "weekStartDate"
    )
    VALUES (
        NEW."macroId",
        auth.uid(),
        1,
        CURRENT_TIMESTAMP,
        date_trunc('week', CURRENT_TIMESTAMP)::date
    )
    ON CONFLICT ("macroId", "userId", "weekStartDate")
    DO UPDATE SET
        "usageCount" = "MacroUsageStats"."usageCount" + 1,
        "lastUsedAt" = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create MacroTicketEvents Table to track macro applications
CREATE TABLE "MacroTicketEvents" (
    "eventId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "ticketId" UUID NOT NULL REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "macroId" UUID NOT NULL REFERENCES "Macros"("macroId") ON DELETE CASCADE,
    "appliedById" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "appliedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for ticket events
CREATE INDEX idx_macro_ticket_events ON "MacroTicketEvents"("ticketId", "appliedAt");

CREATE UNIQUE INDEX one_default_per_account 
ON "Brands"("accountId", "isDefault")
WHERE "isDefault" = true;

CREATE UNIQUE INDEX one_agent_brand_per_account 
ON "Brands"("accountId", "isAgentBrand")
WHERE "isAgentBrand" = true;

-- Create function to ensure at least one default brand per account
CREATE OR REPLACE FUNCTION ensure_default_brand()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is the first brand for an account, make it default
    IF NOT EXISTS (
        SELECT 1 FROM "Brands" 
        WHERE "accountId" = NEW."accountId" 
        AND "brandId" != NEW."brandId"
    ) THEN
        NEW."isDefault" := TRUE;
    END IF;

    -- If trying to unset the default brand
    IF TG_OP = 'UPDATE' AND OLD."isDefault" = TRUE AND NEW."isDefault" = FALSE THEN
        -- Check if there's another default brand
        IF NOT EXISTS (
            SELECT 1 FROM "Brands" 
            WHERE "accountId" = NEW."accountId" 
            AND "brandId" != NEW."brandId" 
            AND "isDefault" = TRUE
        ) THEN
            RAISE EXCEPTION 'Cannot unset default brand without setting another brand as default';
        END IF;
    END IF;

    -- Similar check for agent brand
    IF TG_OP = 'UPDATE' AND OLD."isAgentBrand" = TRUE AND NEW."isAgentBrand" = FALSE THEN
        IF NOT EXISTS (
            SELECT 1 FROM "Brands" 
            WHERE "accountId" = NEW."accountId" 
            AND "brandId" != NEW."brandId" 
            AND "isAgentBrand" = TRUE
        ) THEN
            RAISE EXCEPTION 'Cannot unset agent brand without setting another brand as agent brand';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default brand management
CREATE TRIGGER manage_default_brand
    BEFORE INSERT OR UPDATE ON "Brands"
    FOR EACH ROW
    EXECUTE FUNCTION ensure_default_brand();

-- Create function to sync email from auth.users to UserProfiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Update email in UserProfiles when it changes in auth.users
    IF TG_OP = 'UPDATE' AND OLD."email" != NEW."email" THEN
        UPDATE "UserProfiles"
        SET "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync email changes
CREATE TRIGGER sync_auth_user_email
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    WHEN (OLD."email" IS DISTINCT FROM NEW."email")
    EXECUTE FUNCTION sync_user_email();



-- Create Audit Trail Tables
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete');
CREATE TYPE audit_entity_type AS ENUM (
    'ticket',
    'comment',
    'attachment',
    'custom_field_value',
    'follower',
    'cc',
    'tag',
    'macro'
);

-- Main audit log table
CREATE TABLE "AuditLogs" (
    "auditId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "entityType" audit_entity_type NOT NULL,
    "entityId" UUID NOT NULL,
    "action" audit_action NOT NULL,
    "actorId" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "changes" JSONB NOT NULL, -- Stores old and new values: {"field": {"old": "value", "new": "value"}}
    "metadata" JSONB, -- Additional context about the change
    "ipAddress" INET,
    "userAgent" TEXT,
    "performedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_account ON "AuditLogs"("accountId");
CREATE INDEX idx_audit_logs_entity ON "AuditLogs"("entityType", "entityId");
CREATE INDEX idx_audit_logs_actor ON "AuditLogs"("actorId");
CREATE INDEX idx_audit_logs_performed_at ON "AuditLogs"("performedAt");

-- Function to record comment changes
CREATE OR REPLACE FUNCTION audit_comment_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "AuditLogs" (
        "accountId",
        "entityType",
        "entityId",
        "action",
        "actorId",
        "changes",
        "metadata",
        "ipAddress",
        "userAgent"
    ) 
    SELECT
        t."accountId",
        'comment',
        CASE TG_OP
            WHEN 'DELETE' THEN OLD."commentId"
            ELSE NEW."commentId"
        END,
        CASE TG_OP
            WHEN 'INSERT' THEN 'create'
            WHEN 'UPDATE' THEN 'update'
            WHEN 'DELETE' THEN 'delete'
        END::audit_action,
        COALESCE(auth.uid(), CASE TG_OP
            WHEN 'DELETE' THEN OLD."authorId"
            ELSE NEW."authorId"
        END),
        CASE TG_OP
            WHEN 'UPDATE' THEN jsonb_build_object(
                'content', jsonb_build_object(
                    'old', OLD."content",
                    'new', NEW."content"
                ),
                'isPublic', jsonb_build_object(
                    'old', OLD."isPublic",
                    'new', NEW."isPublic"
                )
            )
            WHEN 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE row_to_json(OLD)::jsonb
        END,
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'operation', TG_OP,
            'ticketId', CASE TG_OP
                WHEN 'DELETE' THEN OLD."ticketId"
                ELSE NEW."ticketId"
            END
        ),
        inet_client_addr(),
        current_setting('request.headers')::json->>'user-agent'
    FROM "Tickets" t
    WHERE t."ticketId" = CASE TG_OP
        WHEN 'DELETE' THEN OLD."ticketId"
        ELSE NEW."ticketId"
    END;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for comment auditing
CREATE TRIGGER audit_comment_changes
    AFTER INSERT OR UPDATE OR DELETE ON "TicketComments"
    FOR EACH ROW EXECUTE FUNCTION audit_comment_changes();

-- Function to record custom field value changes
CREATE OR REPLACE FUNCTION audit_custom_field_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "AuditLogs" (
        "accountId",
        "entityType",
        "entityId",
        "action",
        "actorId",
        "changes",
        "metadata",
        "ipAddress",
        "userAgent"
    ) 
    SELECT
        t."accountId",
        'custom_field_value',
        CASE TG_OP
            WHEN 'DELETE' THEN OLD."fieldId"
            ELSE NEW."fieldId"
        END,
        LOWER(TG_OP)::audit_action,
        auth.uid(),
        CASE TG_OP
            WHEN 'UPDATE' THEN jsonb_build_object(
                'value', jsonb_build_object(
                    'old', OLD."value",
                    'new', NEW."value"
                )
            )
            WHEN 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE row_to_json(OLD)::jsonb
        END,
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'operation', TG_OP,
            'ticketId', CASE TG_OP
                WHEN 'DELETE' THEN OLD."ticketId"
                ELSE NEW."ticketId"
            END
        ),
        inet_client_addr(),
        current_setting('request.headers')::json->>'user-agent'
    FROM "Tickets" t
    WHERE t."ticketId" = CASE TG_OP
        WHEN 'DELETE' THEN OLD."ticketId"
        ELSE NEW."ticketId"
    END;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for custom field value auditing
CREATE TRIGGER audit_custom_field_changes
    AFTER INSERT OR UPDATE OR DELETE ON "TicketCustomFieldValues"
    FOR EACH ROW EXECUTE FUNCTION audit_custom_field_changes();

-- Knowledge Base Tables
CREATE TYPE article_state AS ENUM ('draft', 'published', 'archived', 'faq');
CREATE TYPE content_locale AS ENUM ('en-US', 'es', 'fr', 'de', 'it', 'pt-BR', 'ja'); -- Add more as needed

-- Categories Table
CREATE TABLE "KBCategories" (
    "categoryId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "position" INTEGER,
    "isVisible" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for KBCategories
ALTER TABLE "KBCategories" ENABLE ROW LEVEL SECURITY;

-- Create policies for KBCategories
CREATE POLICY "Anyone can read KB categories"
ON "KBCategories" FOR SELECT
TO public
USING (true);

CREATE POLICY "Account admins can modify KB categories"
ON "KBCategories" FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "KBCategories"."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "KBCategories"."accountId"
    )
);

-- Sections Table with modified constraint
CREATE TABLE "KBSections" (
    "sectionId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "categoryId" UUID REFERENCES "KBCategories"("categoryId") ON DELETE CASCADE,
    "parentSectionId" UUID REFERENCES "KBSections"("sectionId"), -- For subsections
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "position" INTEGER,
    "isVisible" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "valid_parent_section" CHECK (
        ("parentSectionId" IS NULL) OR 
        ("parentSectionId" != "sectionId")
    )
);

-- Enable RLS for KBSections
ALTER TABLE "KBSections" ENABLE ROW LEVEL SECURITY;

-- Create policies for KBSections
CREATE POLICY "Anyone can read KB sections"
ON "KBSections" FOR SELECT
TO public
USING (true);

CREATE POLICY "Account admins can modify KB sections"
ON "KBSections" FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "KBSections"."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "KBSections"."accountId"
    )
);

-- Articles Table
CREATE TABLE "KBArticles" (
    "articleId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "state" article_state NOT NULL DEFAULT 'draft',
    "locale" content_locale NOT NULL DEFAULT 'en-US',
    "sourceArticleId" UUID REFERENCES "KBArticles"("articleId"), -- For translations
    "position" INTEGER,
    "viewCount" INTEGER DEFAULT 0,
    "voteUpCount" INTEGER DEFAULT 0,
    "voteDownCount" INTEGER DEFAULT 0,
    "isCommentsEnabled" BOOLEAN DEFAULT TRUE,
    "isSubscriptionsEnabled" BOOLEAN DEFAULT TRUE,
    "isFAQ" BOOLEAN DEFAULT FALSE,
    "question" VARCHAR(500),
    "shortAnswer" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP,
    "archivedAt" TIMESTAMP
);

-- Enable RLS for KBArticles
ALTER TABLE "KBArticles" ENABLE ROW LEVEL SECURITY;

-- Create policies for KBArticles
CREATE POLICY "Anyone can read KB articles"
ON "KBArticles" FOR SELECT
TO public
USING (true);

CREATE POLICY "Account admins can modify KB articles"
ON "KBArticles" FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "KBArticles"."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "KBArticles"."accountId"
    )
);

-- Article Sections Junction Table (articles can be in multiple sections)
CREATE TABLE "KBArticleSections" (
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "sectionId" UUID REFERENCES "KBSections"("sectionId") ON DELETE CASCADE,
    "position" INTEGER,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("articleId", "sectionId")
);

-- Enable RLS for KBArticleSections
ALTER TABLE "KBArticleSections" ENABLE ROW LEVEL SECURITY;

-- Create policies for KBArticleSections
CREATE POLICY "Anyone can read KB article sections"
ON "KBArticleSections" FOR SELECT
TO public
USING (true);

CREATE POLICY "Account admins can modify KB article sections"
ON "KBArticleSections" FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        JOIN "KBArticles" a ON a."articleId" = "KBArticleSections"."articleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = a."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        JOIN "KBArticles" a ON a."articleId" = "KBArticleSections"."articleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = a."accountId"
    )
);

-- Article Comments Table
CREATE TABLE "KBArticleComments" (
    "commentId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "articleId" UUID NOT NULL REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "authorId" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "isPublic" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for KBArticleComments
ALTER TABLE "KBArticleComments" ENABLE ROW LEVEL SECURITY;

-- Create policies for KBArticleComments
CREATE POLICY "Anyone can read KB article comments"
ON "KBArticleComments" FOR SELECT
TO public
USING (true);

CREATE POLICY "Account admins can modify KB article comments"
ON "KBArticleComments" FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        JOIN "KBArticles" a ON a."articleId" = "KBArticleComments"."articleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = a."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        JOIN "KBArticles" a ON a."articleId" = "KBArticleComments"."articleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = a."accountId"
    )
);

-- Article Subscriptions Table
CREATE TABLE "KBArticleSubscriptions" (
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("articleId", "userId")
);

-- Enable RLS for KBArticleSubscriptions
ALTER TABLE "KBArticleSubscriptions" ENABLE ROW LEVEL SECURITY;

-- Create policies for KBArticleSubscriptions
CREATE POLICY "Anyone can read KB article subscriptions"
ON "KBArticleSubscriptions" FOR SELECT
TO public
USING (true);

CREATE POLICY "Account admins can modify KB article subscriptions"
ON "KBArticleSubscriptions" FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        JOIN "KBArticles" a ON a."articleId" = "KBArticleSubscriptions"."articleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = a."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        JOIN "KBArticles" a ON a."articleId" = "KBArticleSubscriptions"."articleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = a."accountId"
    )
);

-- Article Tags Table
CREATE TABLE "KBArticleTags" (
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "tag" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("articleId", "tag")
);

-- Enable RLS for KBArticleTags
ALTER TABLE "KBArticleTags" ENABLE ROW LEVEL SECURITY;

-- Create policies for KBArticleTags
CREATE POLICY "Anyone can read KB article tags"
ON "KBArticleTags" FOR SELECT
TO public
USING (true);

CREATE POLICY "Account admins can modify KB article tags"
ON "KBArticleTags" FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        JOIN "KBArticles" a ON a."articleId" = "KBArticleTags"."articleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = a."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        JOIN "KBArticles" a ON a."articleId" = "KBArticleTags"."articleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" = 'admin'
        AND u."accountId" = a."accountId"
    )
);

-- Article Attachments Table
CREATE TABLE "KBArticleAttachments" (
    "attachmentId" UUID REFERENCES "Attachments"("attachmentId") ON DELETE CASCADE,
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "position" INTEGER,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("attachmentId", "articleId")
);

-- Article User Segments Table
CREATE TABLE "KBArticleUserSegments" (
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "segmentId" UUID NOT NULL, -- Reference to your user segments system
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("articleId", "segmentId")
);

-- Article Version History Table
CREATE TABLE "KBArticleVersions" (
    "versionId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "articleId" UUID NOT NULL REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "editorId" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "changeNote" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for knowledge base
CREATE INDEX idx_kb_categories_account ON "KBCategories"("accountId");
CREATE INDEX idx_kb_sections_category ON "KBSections"("categoryId");
CREATE INDEX idx_kb_sections_parent ON "KBSections"("parentSectionId");
CREATE INDEX idx_kb_articles_account ON "KBArticles"("accountId");
CREATE INDEX idx_kb_articles_author ON "KBArticles"("authorId");
CREATE INDEX idx_kb_articles_state ON "KBArticles"("state");
CREATE INDEX idx_kb_article_sections_section ON "KBArticleSections"("sectionId");
CREATE INDEX idx_kb_article_comments_article ON "KBArticleComments"("articleId");
CREATE INDEX idx_kb_article_tags_tag ON "KBArticleTags"("tag");


-- Add ticket-article linking table
CREATE TABLE "TicketArticles" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "linkType" VARCHAR(50) NOT NULL CHECK ("linkType" IN ('reference', 'solution', 'related')),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    PRIMARY KEY ("ticketId", "articleId")
);

CREATE INDEX idx_ticket_articles_ticket ON "TicketArticles"("ticketId");
CREATE INDEX idx_ticket_articles_article ON "TicketArticles"("articleId");


-- Create TicketSequences table to track last number per account
CREATE TABLE "TicketSequences" (
    "accountId" UUID PRIMARY KEY REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "lastNumber" BIGINT NOT NULL DEFAULT 0
);


-- Create function to get next ticket number
CREATE OR REPLACE FUNCTION get_next_ticket_number(account_id UUID)
RETURNS BIGINT AS $$
DECLARE
    next_number BIGINT;
BEGIN
    -- Insert or update the sequence record
    INSERT INTO "TicketSequences" ("accountId", "lastNumber")
    VALUES (account_id, 1)
    ON CONFLICT ("accountId") DO UPDATE
    SET "lastNumber" = "TicketSequences"."lastNumber" + 1
    RETURNING "lastNumber" INTO next_number;
    
    RETURN next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function to set ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Set the ticket number using the sequence
    NEW."ticketNumber" := get_next_ticket_number(NEW."accountId");
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set ticket number on insert
CREATE TRIGGER set_ticket_number_on_insert
    BEFORE INSERT ON "Tickets"
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_number();

-- Prevent updates to ticketNumber
CREATE OR REPLACE FUNCTION prevent_ticket_number_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD."ticketNumber" != NEW."ticketNumber" THEN
        RAISE EXCEPTION 'Ticket number cannot be modified';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent ticket number updates
CREATE TRIGGER prevent_ticket_number_update
    BEFORE UPDATE ON "Tickets"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_ticket_number_update();


-- Policy for ticket creation - only authenticated users can create tickets for their account
CREATE POLICY "Users can create tickets for their account"
ON "Tickets" FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."accountId" = "Tickets"."accountId"
    )
);

-- Policy for ticket modification - staff members or ticket creators can modify
CREATE POLICY "Staff or creators can modify tickets"
ON "Tickets" FOR UPDATE
TO authenticated
USING (
    -- Staff members can modify tickets in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = "Tickets"."accountId"
    )
    OR
    -- End users can modify their own tickets
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'end_user'
        AND "Tickets"."requesterId" = auth.uid()
    )
)
WITH CHECK (
    -- Same conditions as USING clause
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = "Tickets"."accountId"
    )
    OR
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'end_user'
        AND "Tickets"."requesterId" = auth.uid()
    )
);

-- Policy for ticket deletion - only admins can delete
CREATE POLICY "Only admins can delete tickets"
ON "Tickets" FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND r."roleCategory" = 'admin'
        AND u."accountId" = "Tickets"."accountId"
    )
);

-- Policy for viewing tickets - staff members or ticket creators can view
CREATE POLICY "Staff or creators can view tickets"
ON "Tickets" FOR SELECT
TO authenticated
USING (
    -- Staff members can view tickets in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = "Tickets"."accountId"
    )
    OR
    -- End users can view their own tickets
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'end_user'
        AND "Tickets"."requesterId" = auth.uid()
    )
);

-- Enable RLS for AuditLogs
ALTER TABLE "AuditLogs" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Authenticated users can view audit logs in their account
CREATE POLICY "Authenticated users can view audit logs in their account"
ON "AuditLogs" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."accountId" = "AuditLogs"."accountId"
    )
);

-- Create INSERT policy - Authenticated users can create audit logs in their account
CREATE POLICY "Authenticated users can create audit logs in their account"
ON "AuditLogs" FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."accountId" = "AuditLogs"."accountId"
    )
);

-- Create UPDATE policy - Authenticated users can update audit logs in their account
CREATE POLICY "Authenticated users can update audit logs in their account"
ON "AuditLogs" FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."accountId" = "AuditLogs"."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."accountId" = "AuditLogs"."accountId"
    )
);

-- Create DELETE policy - Authenticated users can delete audit logs in their account
CREATE POLICY "Authenticated users can delete audit logs in their account"
ON "AuditLogs" FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."accountId" = "AuditLogs"."accountId"
    )
);

-- Enable RLS for Brands
ALTER TABLE "Brands" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Anyone can view brands
CREATE POLICY "Anyone can view brands"
ON "Brands" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."accountId" = "Brands"."accountId"
    )
);

-- Create DELETE policy - Only staff can delete tags for tickets in their account
CREATE POLICY "Staff can delete ticket tags in their account"
ON "TicketTags" FOR DELETE
TO authenticated
USING (
    -- Staff can delete tags for tickets in their account
    EXISTS (
        SELECT 1 FROM "Tickets" t
        JOIN "UserProfiles" u ON u."userId" = auth.uid()
        WHERE t."ticketId" = "TicketTags"."ticketId"
        AND u."userType" = 'staff'
        AND u."accountId" = t."accountId"
    )
);

-- Enable RLS for TicketSequences
ALTER TABLE "TicketSequences" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Authenticated users can view sequences in their account
CREATE POLICY "Authenticated users can view ticket sequences in their account"
ON "TicketSequences" FOR SELECT
TO authenticated
USING (
    -- Users can view sequences in their account
    (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
);

-- Create UPDATE policy - Authenticated users can update sequences in their account
CREATE POLICY "Authenticated users can update ticket sequences in their account"
ON "TicketSequences" FOR UPDATE
TO authenticated
USING (
    -- Users can update sequences in their account
    (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
)
WITH CHECK (
    -- Users can update sequences in their account
    (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
);

-- Enable RLS for TicketReadStatus
ALTER TABLE "TicketReadStatus" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Users can view read status for tickets in their account
CREATE POLICY "Users can view ticket read status in their account"
ON "TicketReadStatus" FOR SELECT
TO authenticated
USING (
    -- -- Users can view read status for tickets in their account
    -- EXISTS (
    --     SELECT 1 FROM "Tickets" t
    --     JOIN "UserProfiles" u ON u."userId" = auth.uid()
    --     WHERE t."ticketId" = "TicketReadStatus"."ticketId"
    --     AND u."accountId" = t."accountId"
    -- )
    true
);

-- Create INSERT policy - Users can create read status for their own user
CREATE POLICY "Users can create their own ticket read status"
ON "TicketReadStatus" FOR INSERT
TO authenticated
WITH CHECK (
    -- Users can only create read status for themselves
    "userId" = auth.uid()
);

-- Create UPDATE policy - Users can update read status for their own user
CREATE POLICY "Users can update their own ticket read status"
ON "TicketReadStatus" FOR UPDATE
TO authenticated
USING (
    -- Users can only update read status for themselves
    "userId" = auth.uid()
)
WITH CHECK (
    -- Users can only update read status for themselves
    "userId" = auth.uid()
);

-- Enable RLS for Macros
ALTER TABLE "Macros" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Staff can view macros in their account
CREATE POLICY "Staff can view macros in their account"
ON "Macros" FOR SELECT
TO authenticated
USING (
    -- Staff can view macros in their account
    (auth.jwt()->'user_metadata'->>'userType')::text = 'staff'
    AND (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
);

-- Create INSERT policy - Staff can create macros in their account
CREATE POLICY "Staff can create macros in their account"
ON "Macros" FOR INSERT
TO authenticated
WITH CHECK (
    -- Staff can create macros in their account
    (auth.jwt()->'user_metadata'->>'userType')::text = 'staff'
    AND (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
);

-- Create UPDATE policy - Staff can update macros in their account
CREATE POLICY "Staff can update macros in their account"
ON "Macros" FOR UPDATE
TO authenticated
USING (
    -- Staff can update macros in their account
    (auth.jwt()->'user_metadata'->>'userType')::text = 'staff'
    AND (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
)
WITH CHECK (
    -- Staff can update macros in their account
    (auth.jwt()->'user_metadata'->>'userType')::text = 'staff'
    AND (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
);

-- Create DELETE policy - Staff can delete macros in their account
CREATE POLICY "Staff can delete macros in their account"
ON "Macros" FOR DELETE
TO authenticated
USING (
    -- Staff can delete macros in their account
    (auth.jwt()->'user_metadata'->>'userType')::text = 'staff'
    AND (auth.jwt()->'user_metadata'->>'accountId')::uuid = "accountId"
);

-- Enable RLS for Permissions
ALTER TABLE "Permissions" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Anyone can read permissions
CREATE POLICY "Anyone can read permissions"
ON "Permissions" FOR SELECT
TO public, anon, authenticated
USING (true);

-- Enable RLS for TicketCustomFieldValues
ALTER TABLE "TicketCustomFieldValues" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Anyone can read custom field values
CREATE POLICY "Anyone can read custom field values"
ON "TicketCustomFieldValues" FOR SELECT
TO authenticated
USING (true);

-- Create INSERT policy - Anyone can create custom field values
CREATE POLICY "Anyone can create custom field values"
ON "TicketCustomFieldValues" FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create UPDATE policy - Anyone can update custom field values
CREATE POLICY "Anyone can update custom field values"
ON "TicketCustomFieldValues" FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create DELETE policy - Anyone can delete custom field values
CREATE POLICY "Anyone can delete custom field values"
ON "TicketCustomFieldValues" FOR DELETE
TO authenticated
USING (true);

-- Enable RLS for Organizations
ALTER TABLE "Organizations" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Anyone can read organizations
CREATE POLICY "Anyone can read organizations"
ON "Organizations" FOR SELECT
TO authenticated
USING (true);

-- Create INSERT policy - Anyone can create organizations
CREATE POLICY "Anyone can create organizations"
ON "Organizations" FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create UPDATE policy - Anyone can update organizations
CREATE POLICY "Anyone can update organizations"
ON "Organizations" FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create DELETE policy - Anyone can delete organizations
CREATE POLICY "Anyone can delete organizations"
ON "Organizations" FOR DELETE
TO authenticated
USING (true);


-- -- Enable RLS on Tickets table if not already enabled

-- -- Create a function to check if user is staff in the same account
-- CREATE OR REPLACE FUNCTION is_staff_user_in_account(ticket_account_id UUID)
-- RETURNS BOOLEAN
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   RETURN EXISTS (
--     SELECT 1 FROM "UserProfiles"
--     WHERE "userId" = auth.uid()
--     AND "userType" = 'staff'
--     AND "accountId" = ticket_account_id
--   );
-- END;
-- $$;

-- -- Revoke all column access first
-- REVOKE SELECT ON "Tickets" FROM authenticated;

-- -- Grant access to specific columns based on user type
-- GRANT SELECT (
--   "ticketId", 
--   "accountId", 
--   "brandId", 
--   "requesterId", 
--   "assigneeId", 
--   "subject", 
--   "description", 
--   "status", 
--   "type", 
--   "createdAt", 
--   "updatedAt", 
--   "solvedAt", 
--   "closedAt"
-- ) ON "Tickets" TO authenticated;

-- -- Grant additional column access to staff users using a policy that respects account boundaries
-- CREATE POLICY "Staff can view all ticket columns in their account"
-- ON "Tickets"
-- FOR SELECT
-- TO authenticated
-- USING (is_staff_user_in_account("accountId"));

-- -- Enable RLS on Tickets table if not already enabled


-- Create SELECT policy for TicketComments
CREATE POLICY "Staff and requesters can view ticket comments"
ON "TicketComments" FOR SELECT
TO authenticated
USING (
    -- Staff members can view all comments in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Tickets" t ON "TicketComments"."ticketId" = t."ticketId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = t."accountId"
    )
    OR
    -- End users can view public comments for their tickets
    EXISTS (
        SELECT 1 FROM "Tickets" t
        WHERE t."ticketId" = "TicketComments"."ticketId"
        AND t."requesterId" = auth.uid()
        AND "TicketComments"."isPublic"
    )
);

-- Create INSERT policy for TicketComments
CREATE POLICY "Staff and requesters can create ticket comments"
ON "TicketComments" FOR INSERT
TO authenticated
WITH CHECK (
    -- Staff members can create comments for tickets in their account
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        JOIN "Tickets" t ON "TicketComments"."ticketId" = t."ticketId"
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = t."accountId"
    )
    OR
    -- End users can create comments for their tickets
    EXISTS (
        SELECT 1 FROM "Tickets" t
        WHERE t."ticketId" = "TicketComments"."ticketId"
        AND t."requesterId" = auth.uid()
        AND "TicketComments"."isPublic" = true  -- End users can only create public comments
    )
);

-- FULL PERMISSIONS


-- Enable RLS for UserGroups
ALTER TABLE "UserGroups" ENABLE ROW LEVEL SECURITY;

-- Create policies for UserGroups - Full access for all authenticated users
CREATE POLICY "Full access to UserGroups"
ON "UserGroups" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for TicketAttachments
ALTER TABLE "TicketAttachments" ENABLE ROW LEVEL SECURITY;

-- Create policies for TicketAttachments - Full access for all authenticated users
CREATE POLICY "Full access to TicketAttachments"
ON "TicketAttachments" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for TicketArticles
ALTER TABLE "TicketArticles" ENABLE ROW LEVEL SECURITY;

-- Create policies for TicketArticles - Full access for all authenticated users
CREATE POLICY "Full access to TicketArticles"
ON "TicketArticles" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for RolePermissions
ALTER TABLE "RolePermissions" ENABLE ROW LEVEL SECURITY;

-- Create policies for RolePermissions - Full access for all authenticated users
CREATE POLICY "Full access to RolePermissions"
ON "RolePermissions" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for Products
ALTER TABLE "Products" ENABLE ROW LEVEL SECURITY;

-- Create policies for Products - Full access for all authenticated users
CREATE POLICY "Full access to Products"
ON "Products" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for PlanFeatures
ALTER TABLE "PlanFeatures" ENABLE ROW LEVEL SECURITY;

-- Create policies for PlanFeatures - Full access for all authenticated users
CREATE POLICY "Full access to PlanFeatures"
ON "PlanFeatures" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for OrganizationDomains
ALTER TABLE "OrganizationDomains" ENABLE ROW LEVEL SECURITY;

-- Create policies for OrganizationDomains - Full access for all authenticated users
CREATE POLICY "Full access to OrganizationDomains"
ON "OrganizationDomains" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for MacroUsageStats
ALTER TABLE "MacroUsageStats" ENABLE ROW LEVEL SECURITY;

-- Create policies for MacroUsageStats - Full access for all authenticated users
CREATE POLICY "Full access to MacroUsageStats"
ON "MacroUsageStats" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for MacroTicketEvents
ALTER TABLE "MacroTicketEvents" ENABLE ROW LEVEL SECURITY;

-- Create policies for MacroTicketEvents - Full access for all authenticated users
CREATE POLICY "Full access to MacroTicketEvents"
ON "MacroTicketEvents" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for MacroCategories
ALTER TABLE "MacroCategories" ENABLE ROW LEVEL SECURITY;

-- Create policies for MacroCategories - Full access for all authenticated users
CREATE POLICY "Full access to MacroCategories"
ON "MacroCategories" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for MacroActions
ALTER TABLE "MacroActions" ENABLE ROW LEVEL SECURITY;

-- Create policies for MacroActions - Full access for all authenticated users
CREATE POLICY "Full access to MacroActions"
ON "MacroActions" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for GroupOrganizationMapping
ALTER TABLE "GroupOrganizationMapping" ENABLE ROW LEVEL SECURITY;

-- Create policies for GroupOrganizationMapping - Full access for all authenticated users
CREATE POLICY "Full access to GroupOrganizationMapping"
ON "GroupOrganizationMapping" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for CommentAttachments
ALTER TABLE "CommentAttachments" ENABLE ROW LEVEL SECURITY;

-- Create policies for CommentAttachments - Full access for all authenticated users
CREATE POLICY "Full access to CommentAttachments"
ON "CommentAttachments" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for ChannelVoice
ALTER TABLE "ChannelVoice" ENABLE ROW LEVEL SECURITY;

-- Create policies for ChannelVoice - Full access for all authenticated users
CREATE POLICY "Full access to ChannelVoice"
ON "ChannelVoice" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for ChannelMessaging
ALTER TABLE "ChannelMessaging" ENABLE ROW LEVEL SECURITY;

-- Create policies for ChannelMessaging - Full access for all authenticated users
CREATE POLICY "Full access to ChannelMessaging"
ON "ChannelMessaging" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for ChannelInbox
ALTER TABLE "ChannelInbox" ENABLE ROW LEVEL SECURITY;

-- Create policies for ChannelInbox - Full access for all authenticated users
CREATE POLICY "Full access to ChannelInbox"
ON "ChannelInbox" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for BrandAgents
ALTER TABLE "BrandAgents" ENABLE ROW LEVEL SECURITY;

-- Create policies for BrandAgents - Full access for all authenticated users
CREATE POLICY "Full access to BrandAgents"
ON "BrandAgents" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- -- Enable RLS for AutomaticTagRules
-- ALTER TABLE "AutomaticTagRules" ENABLE ROW LEVEL SECURITY;

-- -- Create policies for AutomaticTagRules - Full access for all authenticated users
-- CREATE POLICY "Full access to AutomaticTagRules"
-- ON "AutomaticTagRules" FOR ALL
-- TO authenticated
-- USING (true)
-- WITH CHECK (true);

-- Enable RLS for Attachments
ALTER TABLE "Attachments" ENABLE ROW LEVEL SECURITY;

-- Create policies for Attachments - Full access for all authenticated users
CREATE POLICY "Full access to Attachments"
ON "Attachments" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for AccountAddOns
ALTER TABLE "AccountAddOns" ENABLE ROW LEVEL SECURITY;

-- Create policies for AccountAddOns - Full access for all authenticated users
CREATE POLICY "Full access to AccountAddOns"
ON "AccountAddOns" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for CommentReadStatus
ALTER TABLE "CommentReadStatus" ENABLE ROW LEVEL SECURITY;

-- Create policies for CommentReadStatus - Full access for all authenticated users
CREATE POLICY "Full access to CommentReadStatus"
ON "CommentReadStatus" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for CustomFields
ALTER TABLE "CustomFields" ENABLE ROW LEVEL SECURITY;

-- Create policies for CustomFields - Full access for all authenticated users
CREATE POLICY "Full access to CustomFields"
ON "CustomFields" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for Features
ALTER TABLE "Features" ENABLE ROW LEVEL SECURITY;

-- Create policies for Features - Full access for all authenticated users
CREATE POLICY "Full access to Features"
ON "Features" FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable RLS for TicketTags
ALTER TABLE "TicketTags" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy - Staff can read ticket tags in their account
CREATE POLICY "Staff can read ticket tags in their account"
ON "TicketTags" FOR SELECT
TO authenticated
USING (
    -- Staff can read tags for tickets in their account
    EXISTS (
        SELECT 1 FROM "Tickets" t
        JOIN "UserProfiles" u ON u."userId" = auth.uid()
        WHERE t."ticketId" = "TicketTags"."ticketId"
        AND u."userType" = 'staff'
        AND u."accountId" = t."accountId"
    )
);

-- Create INSERT policy - Staff can add tags to tickets in their account
CREATE POLICY "Staff can add ticket tags in their account"
ON "TicketTags" FOR INSERT
TO authenticated
WITH CHECK (
    -- Staff can add tags to tickets in their account
    EXISTS (
        SELECT 1 FROM "Tickets" t
        JOIN "UserProfiles" u ON u."userId" = auth.uid()
        WHERE t."ticketId" = "TicketTags"."ticketId"
        AND u."userType" = 'staff'
        AND u."accountId" = t."accountId"
    )
);

-- Create INSERT policy - End users can add tags to their own tickets
CREATE POLICY "End users can add tags to their own tickets"
ON "TicketTags" FOR INSERT
TO authenticated
WITH CHECK (
    -- End users can add tags to tickets where they are the requester
    EXISTS (
        SELECT 1 FROM "Tickets" t
        JOIN "UserProfiles" u ON u."userId" = auth.uid()
        WHERE t."ticketId" = "TicketTags"."ticketId"
        AND u."userType" = 'end_user'
        AND t."requesterId" = auth.uid()
    )
);



-- Create index for tag lookups
CREATE INDEX idx_ticket_tags_tag ON "TicketTags"("tagId");


-- -- Update AutomaticTagRules table to use tagId
-- ALTER TABLE "AutomaticTagRules" 
-- DROP COLUMN "tag",
-- ADD COLUMN "tagId" UUID REFERENCES "Tags"("tagId") ON DELETE CASCADE;

-- Update the function to propagate tags to ticket
CREATE OR REPLACE FUNCTION propagate_tags_to_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Add user-type tags to the ticket from the requester's account
    INSERT INTO "TicketTags" ("ticketId", "tagId")
    SELECT NEW."ticketId", t."tagId"
    FROM "Tags" t
    WHERE t."accountId" = NEW."accountId"
    AND t."tagType" = 'user'
    ON CONFLICT DO NOTHING;

    -- Add organization-type tags to the ticket if requester belongs to an organization
    INSERT INTO "TicketTags" ("ticketId", "tagId")
    SELECT NEW."ticketId", t."tagId"
    FROM "UserProfiles" u
    JOIN "Tags" t ON t."accountId" = NEW."accountId"
    WHERE u."userId" = NEW."requesterId"
    AND u."organizationId" IS NOT NULL
    AND t."tagType" = 'organization'
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -- Update the function to apply automatic tag rules
-- CREATE OR REPLACE FUNCTION apply_automatic_tag_rules()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     -- Add tags based on automatic tag rules that match the ticket description
--     INSERT INTO "TicketTags" ("ticketId", "tagId")
--     SELECT NEW."ticketId", atr."tagId"
--     FROM "AutomaticTagRules" atr
--     WHERE atr."accountId" = NEW."accountId"
--     AND atr."isActive" = true
--     AND NEW."description" ILIKE '%' || atr."keyword" || '%'
--     ON CONFLICT DO NOTHING;

--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- Enable RLS for Tags
ALTER TABLE "Tags" ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy for Tags
CREATE POLICY "Users can view tags in their account"
ON "Tags" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."accountId" = "Tags"."accountId"
    )
);

-- Create INSERT/UPDATE policy for Tags
CREATE POLICY "Staff can manage tags in their account"
ON "Tags" FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = "Tags"."accountId"
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "UserProfiles" u
        WHERE u."userId" = auth.uid()
        AND u."userType" = 'staff'
        AND u."accountId" = "Tags"."accountId"
    )
);

-- Function to execute raw queries with proper security checks
CREATE OR REPLACE FUNCTION execute_raw_query(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of function creator
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Basic security checks
    IF query ~* 'drop|truncate|delete|update|insert|alter|create|grant' THEN
        RAISE EXCEPTION 'Unauthorized query type detected';
    END IF;

    -- Execute the query and convert results to JSON
    EXECUTE format('
        WITH query_result AS (%s)
        SELECT jsonb_agg(to_jsonb(query_result.*))
        FROM query_result;
    ', query) INTO result;

    RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return a safe error message
        RAISE NOTICE 'Query execution failed: %', SQLERRM;
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Query execution failed: ' || SQLERRM
        );
END;
$$; 