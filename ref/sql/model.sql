-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Role Types Enum
CREATE TYPE "role_type" AS ENUM ('system', 'custom', 'light', 'contributor');

-- Create Role Category Enum
CREATE TYPE "role_category" AS ENUM ('end_user', 'agent', 'admin', 'owner');

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

-- Enable RLS for Plans
ALTER TABLE "Plans" ENABLE ROW LEVEL SECURITY;

-- Create policies for Plans
CREATE POLICY "Plans are viewable by everyone" 
ON "Plans" FOR SELECT 
TO authenticated, anon
USING (true);

-- Create Accounts Table second (depends only on Plans)
CREATE TABLE "Accounts" (
    "accountId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "subdomain" VARCHAR(255) UNIQUE NOT NULL,
    "favicon" VARCHAR(255),
    "planId" UUID REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Accounts
ALTER TABLE "Accounts" ENABLE ROW LEVEL SECURITY;

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

-- Enable RLS for Roles
ALTER TABLE "Roles" ENABLE ROW LEVEL SECURITY;

-- Create Groups Table (depends on Accounts)
CREATE TABLE "Groups" (
    "groupId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "isPrivate" BOOLEAN DEFAULT FALSE,
    "isDefault" BOOLEAN DEFAULT FALSE,
    "solvedTicketReassignmentStrategy" VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Groups
ALTER TABLE "Groups" ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE "Organizations" ENABLE ROW LEVEL SECURITY;

-- Create User Profile Table that extends auth.users
CREATE TABLE "UserProfiles" (
    "userId" UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "userType" VARCHAR(50) NOT NULL CHECK ("userType" IN ('staff', 'end_user')),
    "roleId" UUID REFERENCES "Roles"("roleId"),
    "accountId" UUID REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "organizationId" UUID REFERENCES "Organizations"("organizationId"),
    "isActive" BOOLEAN DEFAULT TRUE,
    "isSuspended" BOOLEAN DEFAULT FALSE,
    "isEmailVerified" BOOLEAN DEFAULT FALSE,
    "lastLoginAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "unique_email_per_account" UNIQUE("userId", "accountId")
);

-- Update Accounts to reference owner
ALTER TABLE "Accounts"
ADD COLUMN "ownerId" UUID REFERENCES "UserProfiles"("userId") ON DELETE SET NULL;

-- Enable RLS for UserProfiles
ALTER TABLE "UserProfiles" ENABLE ROW LEVEL SECURITY;

-- Create indexes for UserProfiles
CREATE INDEX idxUserEmail ON "UserProfiles"("userId");
CREATE INDEX idxUserRole ON "UserProfiles"("roleId");
CREATE INDEX idxUserOrg ON "UserProfiles"("organizationId");
CREATE INDEX idxUserAccount ON "UserProfiles"("accountId");

-- Now we can create all the policies that reference UserProfiles

-- Roles policies
CREATE POLICY "Users can view system and account roles"
ON "Roles" FOR SELECT
TO authenticated
USING (
    "accountId" IS NULL OR
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

-- Create INSERT policy for Roles - only admins can create roles in their account
CREATE POLICY "Only admins can create roles in their account"
ON "Roles" FOR INSERT
TO authenticated
WITH CHECK (
    "accountId" = (
        SELECT up."accountId" 
        FROM "UserProfiles" up
        JOIN "Roles" r ON up."roleId" = r."roleId"
        WHERE up."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Create UPDATE policy for Roles - only admins can modify roles in their account
CREATE POLICY "Only admins can modify roles in their account"
ON "Roles" FOR UPDATE
TO authenticated
USING (
    "accountId" IS NOT NULL
    AND "accountId" = (
        SELECT up."accountId" 
        FROM "UserProfiles" up
        JOIN "Roles" r ON up."roleId" = r."roleId"
        WHERE up."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
)
WITH CHECK (
    "accountId" IS NOT NULL
    AND "accountId" = (
        SELECT up."accountId" 
        FROM "UserProfiles" up
        JOIN "Roles" r ON up."roleId" = r."roleId"
        WHERE up."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Create DELETE policy for Roles - only admins can delete roles in their account
CREATE POLICY "Only admins can delete roles in their account"
ON "Roles" FOR DELETE
TO authenticated
USING (
    "accountId" IS NOT NULL
    AND "accountId" = (
        SELECT up."accountId" 
        FROM "UserProfiles" up
        JOIN "Roles" r ON up."roleId" = r."roleId"
        WHERE up."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Groups policies
CREATE POLICY "Users can view groups in their account"
ON "Groups" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

-- Organizations policies
CREATE POLICY "Users can view organizations in their account"
ON "Organizations" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

-- Accounts policies
CREATE POLICY "Users can view their own account"
ON "Accounts" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

-- UserProfiles policies
CREATE POLICY "Users can view profiles in their account"
ON "UserProfiles" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

CREATE POLICY "Users can update their own profile"
ON "UserProfiles" FOR UPDATE
TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can delete their own profile"
ON "UserProfiles" FOR DELETE
TO authenticated
USING ("userId" = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON "UserProfiles" FOR INSERT
TO authenticated
WITH CHECK ("userId" = auth.uid());

-- Create Products Table
CREATE TABLE "Products" (
    "productId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Products
ALTER TABLE "Products" ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for Products
CREATE POLICY "Products are viewable by everyone" 
ON "Products" FOR SELECT 
TO authenticated, anon
USING (true);

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
ALTER TABLE "Features" ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for Features
CREATE POLICY "Features are viewable by everyone" 
ON "Features" FOR SELECT 
TO authenticated, anon
USING (true);

-- Create Plan_Features Join Table
CREATE TABLE "PlanFeatures" (
    "planId" UUID REFERENCES "Plans"("planId") ON DELETE CASCADE,
    "featureId" UUID REFERENCES "Features"("featureId") ON DELETE CASCADE,
    "accessLevel" VARCHAR(512),
    PRIMARY KEY ("planId", "featureId")
);

-- Enable RLS for PlanFeatures
ALTER TABLE "PlanFeatures" ENABLE ROW LEVEL SECURITY;

-- Create read-only policy for PlanFeatures
CREATE POLICY "PlanFeatures are viewable by everyone" 
ON "PlanFeatures" FOR SELECT 
TO authenticated, anon
USING (true);

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

-- Create read-only policy for AddOns
CREATE POLICY "AddOns are viewable by everyone" 
ON "AddOns" FOR SELECT 
TO authenticated, anon
USING (true);

-- Create AccountAddOns Junction Table
CREATE TABLE "AccountAddOns" (
    "accountId" UUID REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "addOnId" UUID REFERENCES "AddOns"("addOnId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("accountId", "addOnId")
);

-- Enable RLS for AccountAddOns
ALTER TABLE "AccountAddOns" ENABLE ROW LEVEL SECURITY;

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

-- Enable RLS for Brands
ALTER TABLE "Brands" ENABLE ROW LEVEL SECURITY;

-- Create WRITE policy for Brands - only admins can modify brands
CREATE POLICY "Only admins can modify brands"
ON "Brands" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Enable RLS for BrandAgents
ALTER TABLE "BrandAgents" ENABLE ROW LEVEL SECURITY;

-- Create WRITE policy for BrandAgents - only admins can modify brand memberships
CREATE POLICY "Only admins can modify brand memberships"
ON "BrandAgents" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Create GroupOrganizationMapping Table
CREATE TABLE "GroupOrganizationMapping" (
    "groupId" UUID REFERENCES "Groups"("groupId") ON DELETE CASCADE,
    "organizationId" UUID REFERENCES "Organizations"("organizationId") ON DELETE CASCADE,
    PRIMARY KEY ("groupId", "organizationId")
);

-- Enable RLS for GroupOrganizationMapping
ALTER TABLE "GroupOrganizationMapping" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for GroupOrganizationMapping
CREATE POLICY "Users can view group-org mappings in their account"
ON "GroupOrganizationMapping" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM "Organizations" o
        WHERE o."organizationId" = "GroupOrganizationMapping"."organizationId"
        AND o."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

-- Create WRITE policy for GroupOrganizationMapping - only admins can modify
CREATE POLICY "Only admins can modify group-org mappings"
ON "GroupOrganizationMapping" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
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

-- Enable RLS for Permissions
ALTER TABLE "Permissions" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for Permissions
CREATE POLICY "Permissions are viewable by authenticated users"
ON "Permissions" FOR SELECT
TO authenticated
USING (true);

-- Create WRITE policy for Permissions - only admins can modify
CREATE POLICY "Only admins can modify permissions"
ON "Permissions" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Create RolePermissions Join Table
CREATE TABLE "RolePermissions" (
    "roleId" UUID REFERENCES "Roles"("roleId") ON DELETE CASCADE,
    "permissionId" UUID REFERENCES "Permissions"("permissionId") ON DELETE CASCADE,
    PRIMARY KEY ("roleId", "permissionId")
);

-- Enable RLS for RolePermissions
ALTER TABLE "RolePermissions" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for RolePermissions
CREATE POLICY "RolePermissions are viewable by authenticated users"
ON "RolePermissions" FOR SELECT
TO authenticated
USING (true);

-- Create WRITE policy for RolePermissions - only admins can modify
CREATE POLICY "Only admins can modify role permissions"
ON "RolePermissions" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
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

-- Enable RLS for OrganizationDomains
ALTER TABLE "OrganizationDomains" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for OrganizationDomains
CREATE POLICY "Users can view domains in their account"
ON "OrganizationDomains" FOR SELECT
TO authenticated
USING (
    "organizationId" IN (
        SELECT "organizationId" 
        FROM "Organizations" 
        WHERE "accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

-- Create OrganizationTags Table
CREATE TABLE "OrganizationTags" (
    "organizationId" UUID REFERENCES "Organizations"("organizationId") ON DELETE CASCADE,
    "tag" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("organizationId", "tag")
);

-- Enable RLS for OrganizationTags
ALTER TABLE "OrganizationTags" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for OrganizationTags
CREATE POLICY "Users can view tags in their account"
ON "OrganizationTags" FOR SELECT
TO authenticated
USING (
    "organizationId" IN (
        SELECT "organizationId" 
        FROM "Organizations" 
        WHERE "accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

-- Create indexes for optimization
CREATE INDEX idx_org_domains ON "OrganizationDomains"("domain");
CREATE INDEX idx_org_tags ON "OrganizationTags"("tag");

-- Create READ policy for AccountAddOns - users can only read add-ons for their account
CREATE POLICY "Users can view add-ons for their account"
ON "AccountAddOns" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

-- Create UserGroups Join Table for handling multiple group assignments
CREATE TABLE "UserGroups" (
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "groupId" UUID REFERENCES "Groups"("groupId") ON DELETE CASCADE,
    "isDefault" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "groupId")
);

-- Enable RLS for UserGroups
ALTER TABLE "UserGroups" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for UserGroups
CREATE POLICY "Users can view user-group mappings in their account"
ON "UserGroups" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM "Groups" g
        WHERE g."groupId" = "UserGroups"."groupId"
        AND g."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

-- Create WRITE policy for UserGroups - only admins can modify
CREATE POLICY "Only admins can modify user-group mappings"
ON "UserGroups" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Create function to ensure only one default group per account
CREATE OR REPLACE FUNCTION check_default_group()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW."isDefault" THEN
        -- Set "isDefault" to false for all other groups in the same account
        UPDATE "Groups" 
        SET "isDefault" = FALSE 
        WHERE "accountId" = NEW."accountId" 
        AND "groupId" != NEW."groupId" 
        AND "isDefault" = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default group constraint
CREATE TRIGGER ensure_single_default_group
    BEFORE INSERT OR UPDATE ON "Groups"
    FOR EACH ROW
    WHEN (NEW."isDefault" = TRUE)
    EXECUTE FUNCTION check_default_group();

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
    )
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

-- Create indexes for custom fields
CREATE INDEX idx_custom_fields_account ON "CustomFields"("accountId");
CREATE INDEX idx_custom_field_values_field ON "TicketCustomFieldValues"("fieldId");

-- Enable RLS for custom fields tables
ALTER TABLE "CustomFields" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketCustomFieldValues" ENABLE ROW LEVEL SECURITY;

-- Create READ policies for custom fields
CREATE POLICY "Users can view custom fields in their account"
ON "CustomFields" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

CREATE POLICY "Users can view custom field values for accessible tickets"
ON "TicketCustomFieldValues" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Tickets" t
        WHERE t."ticketId" = "TicketCustomFieldValues"."ticketId"
        AND t."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

-- Create WRITE policies for custom fields - only admins can modify field definitions
CREATE POLICY "Only admins can modify custom fields"
ON "CustomFields" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Agents can modify custom field values for tickets they have access to
CREATE POLICY "Agents can modify custom field values for accessible tickets"
ON "TicketCustomFieldValues" USING (
    EXISTS (
        SELECT 1 
        FROM "Tickets" t
        JOIN "UserProfiles" u ON u."userId" = auth.uid()
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE t."ticketId" = "TicketCustomFieldValues"."ticketId"
        AND (
            r."canManageAllTickets" = true
            OR (
                r."roleCategory" IN ('agent', 'admin', 'owner')
                AND (
                    t."assigneeId" = auth.uid()
                    OR t."assigneeGroupId" IN (
                        SELECT "groupId" 
                        FROM "UserGroups" 
                        WHERE "userId" = auth.uid()
                    )
                )
            )
        )
    )
);

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

-- Enable RLS for attachment tables
ALTER TABLE "Attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketAttachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommentAttachments" ENABLE ROW LEVEL SECURITY;

-- Create READ policies for attachments
CREATE POLICY "Users can view public attachments in their account"
ON "Attachments" FOR SELECT
TO authenticated
USING (
    ("isPublic" = true AND "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    ))
    OR "uploadedById" = auth.uid()
    OR EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" IN ('agent', 'admin', 'owner')
    )
);

-- Create WRITE policies for attachments
CREATE POLICY "Users can upload attachments to their tickets"
ON "Attachments" FOR INSERT
TO authenticated
WITH CHECK (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

CREATE POLICY "Only uploaders and admins can modify attachments"
ON "Attachments" FOR UPDATE
TO authenticated
USING (
    "uploadedById" = auth.uid()
    OR EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Create READ policies for attachment junctions
CREATE POLICY "Users can view ticket attachments they have access to"
ON "TicketAttachments" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Tickets" t
        WHERE t."ticketId" = "TicketAttachments"."ticketId"
        AND t."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

CREATE POLICY "Users can view comment attachments they have access to"
ON "CommentAttachments" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "TicketComments" tc
        JOIN "Tickets" t ON t."ticketId" = tc."ticketId"
        WHERE tc."commentId" = "CommentAttachments"."commentId"
        AND t."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

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

-- Create TicketTags Junction Table
CREATE TABLE "TicketTags" (
    "ticketId" UUID REFERENCES "Tickets"("ticketId") ON DELETE CASCADE,
    "tag" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("ticketId", "tag")
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
CREATE INDEX idx_ticket_tags ON "TicketTags"("tag");

-- Enable RLS for all ticket-related tables
ALTER TABLE "Tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketComments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketFollowers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketCCs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketTags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketSharing" ENABLE ROW LEVEL SECURITY;

-- Create READ policies
CREATE POLICY "Users can view tickets in their account"
ON "Tickets" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
    OR 
    EXISTS (
        SELECT 1 FROM "TicketCCs" 
        WHERE "ticketId" = "Tickets"."ticketId" 
        AND "userId" = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM "TicketFollowers"
        WHERE "ticketId" = "Tickets"."ticketId" 
        AND "userId" = auth.uid()
    )
);

-- Create WRITE policies
CREATE POLICY "Agents can modify tickets they have access to"
ON "Tickets" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (
            r."canManageAllTickets" = true
            OR (
                r."roleCategory" IN ('agent', 'admin', 'owner')
                AND (
                    "Tickets"."assigneeId" = auth.uid()
                    OR "Tickets"."assigneeGroupId" IN (
                        SELECT "groupId" 
                        FROM "UserGroups" 
                        WHERE "userId" = auth.uid()
                    )
                )
            )
        )
    )
);

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

-- Enable RLS for read status tables
ALTER TABLE "TicketReadStatus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommentReadStatus" ENABLE ROW LEVEL SECURITY;

-- Create READ policies for read status tables
CREATE POLICY "Users can view their own read status"
ON "TicketReadStatus" FOR SELECT
TO authenticated
USING (
    "userId" = auth.uid()
    OR EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."canManageAllTickets" = true
    )
);

CREATE POLICY "Users can view their own comment read status"
ON "CommentReadStatus" FOR SELECT
TO authenticated
USING (
    "userId" = auth.uid()
    OR EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."canManageAllTickets" = true
    )
);

-- -- Create WRITE policies for read status tables
-- CREATE POLICY "Users can update their own read status"
-- ON "TicketReadStatus" FOR INSERT
-- TO authenticated
-- USING ("userId" = auth.uid());

-- CREATE POLICY "Users can update their own read status"
-- ON "TicketReadStatus" FOR UPDATE
-- TO authenticated
-- USING ("userId" = auth.uid());

-- CREATE POLICY "Users can update their own comment read status"
-- ON "CommentReadStatus" FOR INSERT
-- TO authenticated
-- USING ("userId" = auth.uid());

-- CREATE POLICY "Users can update their own comment read status"
-- ON "CommentReadStatus" FOR UPDATE
-- TO authenticated
-- USING ("userId" = auth.uid());

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

-- Enable RLS for channel tables
ALTER TABLE "Channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelInbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelVoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChannelMessaging" ENABLE ROW LEVEL SECURITY;

-- Create READ policies
CREATE POLICY "Users can view channels in their account"
ON "Channels" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

-- Create WRITE policies - only admins can modify channels
CREATE POLICY "Only admins can modify channels"
ON "Channels" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Similar RLS policies for channel type tables
CREATE POLICY "Users can view channel inboxes in their account"
ON "ChannelInbox" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Channels" c
        WHERE c."channelId" = "ChannelInbox"."channelId"
        AND c."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

CREATE POLICY "Users can view channel voice in their account"
ON "ChannelVoice" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Channels" c
        WHERE c."channelId" = "ChannelVoice"."channelId"
        AND c."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

CREATE POLICY "Users can view channel messaging in their account"
ON "ChannelMessaging" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Channels" c
        WHERE c."channelId" = "ChannelMessaging"."channelId"
        AND c."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

-- Create UserTags Junction Table
CREATE TABLE "UserTags" (
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "tag" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("userId", "tag")
);

-- Create AutomaticTagRules Table for keyword-based tagging
CREATE TABLE "AutomaticTagRules" (
    "ruleId" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "accountId" UUID NOT NULL REFERENCES "Accounts"("accountId") ON DELETE CASCADE,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "keyword" VARCHAR(255) NOT NULL,
    "tag" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for tag-based searching
CREATE INDEX idx_user_tags ON "UserTags"("tag");
CREATE INDEX idx_auto_tag_rules_account ON "AutomaticTagRules"("accountId");
CREATE INDEX idx_auto_tag_rules_keyword ON "AutomaticTagRules"("keyword");

-- Enable RLS for tag tables
ALTER TABLE "UserTags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrganizationTags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AutomaticTagRules" ENABLE ROW LEVEL SECURITY;

-- Create READ policies for tag tables
CREATE POLICY "Users can view tags in their account"
ON "UserTags" FOR SELECT
TO authenticated
USING (
    "userId" IN (
        SELECT "userId" 
        FROM "UserProfiles" 
        WHERE "accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

CREATE POLICY "Users can view organization tags in their account"
ON "OrganizationTags" FOR SELECT
TO authenticated
USING (
    "organizationId" IN (
        SELECT "organizationId" 
        FROM "Organizations" 
        WHERE "accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

CREATE POLICY "Users can view automatic tag rules in their account"
ON "AutomaticTagRules" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

-- Create WRITE policies for tag tables - only admins can modify
CREATE POLICY "Only admins can modify tags"
ON "UserTags" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

CREATE POLICY "Only admins can modify organization tags"
ON "OrganizationTags" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

CREATE POLICY "Only admins can modify automatic tag rules"
ON "AutomaticTagRules" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

-- Create function to automatically propagate user and organization tags to tickets
CREATE OR REPLACE FUNCTION propagate_tags_to_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Add requester's tags to the ticket
    INSERT INTO "TicketTags" ("ticketId", "tag")
    SELECT NEW."ticketId", ut."tag"
    FROM "UserTags" ut
    WHERE ut."userId" = NEW."requesterId"
    ON CONFLICT DO NOTHING;

    -- Add organization's tags to the ticket if requester belongs to an organization
    INSERT INTO "TicketTags" ("ticketId", "tag")
    SELECT NEW."ticketId", ot."tag"
    FROM "UserProfiles" u
    JOIN "OrganizationTags" ot ON u."organizationId" = ot."organizationId"
    WHERE u."userId" = NEW."requesterId"
    AND u."organizationId" IS NOT NULL
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -- Create trigger to propagate tags when ticket is created
-- CREATE TRIGGER propagate_tags_on_ticket_creation
--     AFTER INSERT ON "Tickets"
--     FOR EACH ROW
--     EXECUTE FUNCTION propagate_tags_to_ticket();

-- Create function to apply automatic tag rules
CREATE OR REPLACE FUNCTION apply_automatic_tag_rules()
RETURNS TRIGGER AS $$
BEGIN
    -- Add tags based on automatic tag rules that match the ticket description
    INSERT INTO "TicketTags" ("ticketId", "tag")
    SELECT NEW."ticketId", atr."tag"
    FROM "AutomaticTagRules" atr
    WHERE atr."accountId" = NEW."accountId"
    AND atr."isActive" = true
    AND NEW."description" ILIKE '%' || atr."keyword" || '%'
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to apply automatic tag rules when ticket is created or updated
CREATE TRIGGER apply_automatic_tag_rules_on_ticket
    AFTER INSERT OR UPDATE OF "description" ON "Tickets"
    FOR EACH ROW
    EXECUTE FUNCTION apply_automatic_tag_rules();

-- Create MacroCategories Table
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

-- Enable RLS for macro-related tables
ALTER TABLE "MacroCategories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Macros" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MacroActions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MacroUsageStats" ENABLE ROW LEVEL SECURITY;

-- Create READ policies
CREATE POLICY "Users can view macro categories in their account"
ON "MacroCategories" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

CREATE POLICY "Users can view macros in their account"
ON "Macros" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
    OR (
        "isPersonal" = true 
        AND "createdById" = auth.uid()
    )
);

CREATE POLICY "Users can view macro actions in their account"
ON "MacroActions" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Macros" m
        WHERE m."macroId" = "MacroActions"."macroId"
        AND (
            m."accountId" = (
                SELECT "accountId" 
                FROM "UserProfiles" 
                WHERE "userId" = auth.uid()
            )
            OR (
                m."isPersonal" = true 
                AND m."createdById" = auth.uid()
            )
        )
    )
);

-- Create WRITE policies
CREATE POLICY "Only admins can modify macro categories"
ON "MacroCategories" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

CREATE POLICY "Users can manage their personal macros"
ON "Macros" USING (
    ("isPersonal" = true AND "createdById" = auth.uid())
    OR EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

CREATE POLICY "Users can manage their personal macro actions"
ON "MacroActions" USING (
    EXISTS (
        SELECT 1 FROM "Macros" m
        WHERE m."macroId" = "MacroActions"."macroId"
        AND (
            (m."isPersonal" = true AND m."createdById" = auth.uid())
            OR EXISTS (
                SELECT 1 
                FROM "UserProfiles" u
                JOIN "Roles" r ON u."roleId" = r."roleId"
                WHERE u."userId" = auth.uid()
                AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
            )
        )
    )
);

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

-- Enable RLS for macro ticket events
ALTER TABLE "MacroTicketEvents" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for macro ticket events
CREATE POLICY "Users can view macro events for accessible tickets"
ON "MacroTicketEvents" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Tickets" t
        WHERE t."ticketId" = "MacroTicketEvents"."ticketId"
        AND t."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

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

-- Create READ policy for BrandAgents
CREATE POLICY "Users can view brand memberships in their account"
ON "BrandAgents" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM "Brands" b
        WHERE b."brandId" = "BrandAgents"."brandId"
        AND b."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);

-- Create READ policy for Brands
CREATE POLICY "Users can view brands in their account"
ON "Brands" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

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

-- Create function to create UserProfile when new auth.user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "UserProfiles" ("userId", "name", "userType")
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), 'end_user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

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

-- Enable RLS for audit logs
ALTER TABLE "AuditLogs" ENABLE ROW LEVEL SECURITY;

-- Create READ policy for audit logs - only staff can view
CREATE POLICY "Staff can view audit logs in their account"
ON "AuditLogs" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" IN ('agent', 'admin', 'owner')
        AND u."accountId" = "AuditLogs"."accountId"
    )
);

-- Function to record ticket changes
CREATE OR REPLACE FUNCTION audit_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes_json JSONB := '{}'::JSONB;
    field_name TEXT;
    old_row JSONB := CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::JSONB ELSE '{}'::JSONB END;
    new_row JSONB := CASE WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::JSONB 
                          WHEN TG_OP = 'UPDATE' THEN row_to_json(NEW)::JSONB
                          ELSE '{}'::JSONB END;
BEGIN
    -- For updates, compare old and new values
    IF TG_OP = 'UPDATE' THEN
        FOR field_name IN (SELECT DISTINCT key FROM jsonb_object_keys(old_row) UNION SELECT DISTINCT key FROM jsonb_object_keys(new_row))
        LOOP
            IF old_row ->> field_name IS DISTINCT FROM new_row ->> field_name THEN
                changes_json := changes_json || jsonb_build_object(
                    field_name,
                    jsonb_build_object(
                        'old', old_row ->> field_name,
                        'new', new_row ->> field_name
                    )
                );
            END IF;
        END LOOP;
    -- For inserts and deletes, include all fields
    ELSE
        changes_json := jsonb_build_object(
            'data',
            CASE 
                WHEN TG_OP = 'INSERT' THEN new_row
                WHEN TG_OP = 'DELETE' THEN old_row
                ELSE '{}'::JSONB
            END
        );
    END IF;

    -- Record the audit log
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
    ) VALUES (
        CASE TG_OP
            WHEN 'DELETE' THEN OLD."accountId"
            ELSE NEW."accountId"
        END,
        'ticket',
        CASE TG_OP
            WHEN 'DELETE' THEN OLD."ticketId"
            ELSE NEW."ticketId"
        END,
        LOWER(TG_OP)::audit_action,
        auth.uid(),
        changes_json,
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA,
            'operation', TG_OP
        ),
        inet_client_addr(),
        current_setting('request.headers')::json->>'user-agent'
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for ticket auditing
CREATE TRIGGER audit_ticket_changes
    AFTER INSERT OR UPDATE OR DELETE ON "Tickets"
    FOR EACH ROW EXECUTE FUNCTION audit_ticket_changes();

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
        LOWER(TG_OP)::audit_action,
        auth.uid(),
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
CREATE TYPE article_state AS ENUM ('draft', 'published', 'archived');
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

-- Create function to check section depth
CREATE OR REPLACE FUNCTION check_section_depth(section_id UUID, parent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    depth INTEGER;
BEGIN
    WITH RECURSIVE section_depth AS (
        SELECT s."sectionId", s."parentSectionId", 1 as depth
        FROM "KBSections" s
        WHERE s."sectionId" = parent_id
        UNION ALL
        SELECT s."sectionId", s."parentSectionId", sd.depth + 1
        FROM "KBSections" s
        JOIN section_depth sd ON s."parentSectionId" = sd."sectionId"
        WHERE sd.depth < 5
    )
    SELECT MAX(depth) INTO depth FROM section_depth;
    
    RETURN COALESCE(depth, 0) < 5;
END;
$$ LANGUAGE plpgsql;

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
    ),
    CONSTRAINT max_section_depth CHECK (
        check_section_depth("sectionId", "parentSectionId")
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
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP,
    "archivedAt" TIMESTAMP
);

-- Article Sections Junction Table (articles can be in multiple sections)
CREATE TABLE "KBArticleSections" (
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "sectionId" UUID REFERENCES "KBSections"("sectionId") ON DELETE CASCADE,
    "position" INTEGER,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("articleId", "sectionId")
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

-- Article Subscriptions Table
CREATE TABLE "KBArticleSubscriptions" (
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "userId" UUID REFERENCES "UserProfiles"("userId") ON DELETE CASCADE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("articleId", "userId")
);

-- Article Tags Table
CREATE TABLE "KBArticleTags" (
    "articleId" UUID REFERENCES "KBArticles"("articleId") ON DELETE CASCADE,
    "tag" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("articleId", "tag")
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

-- Enable RLS for knowledge base tables
ALTER TABLE "KBCategories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBSections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBArticles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBArticleSections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBArticleComments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBArticleSubscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBArticleTags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBArticleAttachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBArticleUserSegments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KBArticleVersions" ENABLE ROW LEVEL SECURITY;

-- Create READ policies for knowledge base
CREATE POLICY "Users can view public categories in their account"
ON "KBCategories" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

CREATE POLICY "Users can view public sections in their account"
ON "KBSections" FOR SELECT
TO authenticated
USING (
    "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    )
);

CREATE POLICY "Users can view articles they have access to"
ON "KBArticles" FOR SELECT
TO authenticated
USING (
    ("state" = 'published' AND "accountId" = (
        SELECT "accountId" 
        FROM "UserProfiles" 
        WHERE "userId" = auth.uid()
    ))
    OR "authorId" = auth.uid()
    OR EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND r."roleCategory" IN ('agent', 'admin', 'owner')
    )
);

-- Create WRITE policies for knowledge base - only admins and authorized agents
CREATE POLICY "Only admins and authorized agents can modify categories"
ON "KBCategories" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

CREATE POLICY "Only admins and authorized agents can modify sections"
ON "KBSections" USING (
    EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

CREATE POLICY "Authors and admins can modify articles"
ON "KBArticles" USING (
    "authorId" = auth.uid()
    OR EXISTS (
        SELECT 1 
        FROM "UserProfiles" u
        JOIN "Roles" r ON u."roleId" = r."roleId"
        WHERE u."userId" = auth.uid()
        AND (r."roleCategory" = 'admin' OR r."roleCategory" = 'owner')
    )
);

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

ALTER TABLE "TicketArticles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket article links they have access to"
ON "TicketArticles" FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "Tickets" t
        WHERE t."ticketId" = "TicketArticles"."ticketId"
        AND t."accountId" = (
            SELECT "accountId" 
            FROM "UserProfiles" 
            WHERE "userId" = auth.uid()
        )
    )
);
