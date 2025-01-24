// import "dotenv/config"
import fetch from 'node-fetch'
import { createClient, User } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import dotenv from 'dotenv'
import type { Database } from '../src/types/supatypes'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

// Get current directory path
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_PROJECT_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials. Make sure VITE_SUPABASE_PROJECT_URL and SUPABASE_SERVICE_KEY are set in your .env file.')
}

// Now TypeScript knows these are strings
const SUPABASE_URL: string = supabaseUrl
const SUPABASE_SERVICE_KEY: string = supabaseServiceKey

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    fetch: fetch as any
  }
})

// Define types from the database schema
type RoleType = 'system' | 'custom' | 'light' | 'contributor'
type RoleCategory = 'end_user' | 'agent' | 'admin' | 'owner'
type UserType = 'staff' | 'end_user'

// Define types for the JSON data
type PlanFeatureValue = boolean | string | null
type PlanData = {
  [key: string]: PlanFeatureValue
  'Annual Subscription Term (per agent per month)': string
  'Monthly Subscription Term (per agent per month)': string
}
type PlansJson = {
  [planName: string]: PlanData
}

// Add channel type definition from the database schema
type ChannelType = 'email' | 'help_center' | 'web_messaging' | 'mobile_messaging' | 'whatsapp' | 
  'line' | 'facebook' | 'facebook_messenger' | 'twitter' | 'twitter_dm' | 'instagram_direct' | 
  'wechat' | 'voice' | 'text' | 'live_chat' | 'web_widget' | 'mobile_sdk' | 'api' | 'cti' | 
  'closed_ticket';

// Add function to generate channel configuration based on type
function generateChannelConfig(type: ChannelType): any {
  switch (type) {
    case 'email':
      return {
        forwardingAddress: faker.internet.email(),
        customDomain: faker.internet.domainName(),
        emailTemplate: 'default'
      };
    case 'web_messaging':
      return {
        widgetColor: faker.internet.color(),
        welcomeMessage: faker.company.catchPhrase(),
        offlineMessage: 'We\'re currently offline. Please leave a message.'
      };
    case 'whatsapp':
      return {
        phoneNumber: faker.phone.number(),
        businessName: faker.company.name(),
        welcomeMessage: faker.company.catchPhrase()
      };
    case 'voice':
      return {
        phoneNumber: faker.phone.number(),
        voicemailGreeting: 'Please leave a message after the tone.',
        businessHours: {
          monday: { start: '9:00', end: '17:00' },
          tuesday: { start: '9:00', end: '17:00' },
          wednesday: { start: '9:00', end: '17:00' },
          thursday: { start: '9:00', end: '17:00' },
          friday: { start: '9:00', end: '17:00' }
        }
      };
    case 'live_chat':
      return {
        widgetColor: faker.internet.color(),
        onlineMessage: 'We\'re here to help!',
        offlineMessage: 'Leave us a message',
        operatingHours: {
          timezone: 'UTC',
          schedule: {
            monday: { start: '9:00', end: '17:00' },
            tuesday: { start: '9:00', end: '17:00' },
            wednesday: { start: '9:00', end: '17:00' },
            thursday: { start: '9:00', end: '17:00' },
            friday: { start: '9:00', end: '17:00' }
          }
        }
      };
    default:
      return {};
  }
}

// Add function to create channels for an account
async function createChannelsForAccount(accountId: string, brandId: string): Promise<Database['public']['Tables']['Channels']['Row'][]> {
  // Define common channels that most accounts would have
  const commonChannelTypes: ChannelType[] = [
    'email',
    'help_center',
    'web_messaging',
    'web_widget',
    'live_chat'
  ];

  // Define additional channels that some accounts might have
  const additionalChannelTypes: ChannelType[] = [
    'whatsapp',
    'facebook_messenger',
    'twitter',
    'voice',
    'text',
    'mobile_sdk',
    'api'
  ];

  // Always create common channels
  const channelsToCreate = [...commonChannelTypes];

  // Randomly add 2-4 additional channels
  const numAdditionalChannels = faker.number.int({ min: 2, max: 4 });
  const selectedAdditionalChannels = faker.helpers.arrayElements(additionalChannelTypes, numAdditionalChannels);
  channelsToCreate.push(...selectedAdditionalChannels);

  // Create channel records
  const channelData = channelsToCreate.map(type => ({
    accountId,
    brandId,
    type,
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Channel',
    description: faker.company.catchPhrase(),
    isEnabled: faker.datatype.boolean(0.9), // 90% chance of being enabled
    configuration: generateChannelConfig(type),
    createdAt: faker.date.past({ years: 1 }).toISOString(),
    updatedAt: faker.date.recent().toISOString()
  }));

  const { data: channels, error } = await supabase
    .from('Channels')
    .insert(channelData)
    .select();

  if (error) throw error;
  if (!channels) throw new Error('No channels were created');

  console.log(`Created ${channels.length} channels for account`);
  return channels;
}

// Company seed data
const companies = [
  {
    name: 'TechFlow Solutions',
    subdomain: 'techflow',
    industry: 'Technology',
    description: 'Enterprise software solutions provider',
    size: 'Large',
    useCase: 'Customer support for SaaS products',
    planName: 'Suite Professional' // Large company, high-end plan
  },
  {
    name: 'GreenLeaf Organics',
    subdomain: 'greenleaf',
    industry: 'Food & Agriculture',
    description: 'Organic food distribution company',
    size: 'Medium',
    useCase: 'Order management and supplier support',
    planName: 'Suite Growth' // Medium company, mid-tier plan
  },
  {
    name: 'SwiftCare Medical',
    subdomain: 'swiftcare',
    industry: 'Healthcare',
    description: 'Telemedicine platform provider',
    size: 'Large',
    useCase: 'Patient support and appointment management',
    planName: 'Suite Professional' // Large healthcare company, high-end plan
  },
  {
    name: 'EduTech Innovators',
    subdomain: 'edutech',
    industry: 'Education',
    description: 'Online learning platform',
    size: 'Small',
    useCase: 'Student and teacher support',
    planName: 'Support Team' // Small company, basic support plan
  },
  {
    name: 'FinServe Global',
    subdomain: 'finserve',
    industry: 'Financial Services',
    description: 'Digital banking solutions',
    size: 'Large',
    useCase: 'Customer service for banking products',
    planName: 'Support Professional' // Large company, professional support plan
  }
]

async function resetDatabase() {
  console.log('Resetting entire database...')
  
  // Use Supabase's REST API to reset the database
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      cmd: 'reset'
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Failed to reset database:', error)
    throw new Error(`Failed to reset database: ${error}`)
  }

  console.log('Database reset completed')
}

async function seedCompanyData() {
  try {
    console.log('Starting company data seeding...')
    
    // Get all available plans first
    const { data: plans, error: plansError } = await supabase
      .from('Plans')
      .select()
    
    if (plansError || !plans) {
      throw new Error(`Failed to fetch plans: ${plansError?.message || 'No plans found'}`)
    }

    // Process companies sequentially instead of in parallel
    for (const company of companies) {
      console.log(`Processing ${company.name}...`)
      
      // Create auth users for this company
      const numEndUsers = 5
      const totalUsers = 11 + numEndUsers
      const userDataForCompany = Array.from({ length: totalUsers }, () => ({
        email: faker.internet.email(),
        password: 'Password123!',
        email_confirm: true,
        user_metadata: {
          full_name: faker.person.fullName()
        },
        app_metadata: {
          provider: 'email'
        }
      }))

      // Batch create auth users in groups of 10
      const batchSize = 10
      const authUsers: User[] = []
      for (let i = 0; i < userDataForCompany.length; i += batchSize) {
        const batch = userDataForCompany.slice(i, i + batchSize)
        const createPromises = batch.map(userData => 
          supabase.auth.admin.createUser(userData)
            .then(({ data }) => data?.user)
            .catch(error => {
              console.error('Failed to create auth user:', error)
              return null
            })
        )
        const users = await Promise.all(createPromises)
        authUsers.push(...users.filter((user): user is User => user !== null))
      }

      // Find the corresponding plan
      const plan = plans.find(p => p.name === company.planName)
      if (!plan) {
        throw new Error(`Plan not found for ${company.name}: ${company.planName}`)
      }

      // Create account and initial data
      const { data: account, error: accountError } = await supabase
        .from('Accounts')
        .insert({
          name: company.name,
          subdomain: company.subdomain,
          planId: plan.planId
        })
        .select()
        .single()
      
      if (accountError) throw accountError
      console.log(`Created account: ${account.name}`)

      // 2. Create Roles for the account
      const roles: Database['public']['Tables']['Roles']['Insert'][] = [
        {
          name: 'Account Owner',
          description: 'Full access to all features',
          roleType: 'system' as RoleType,
          roleCategory: 'owner' as RoleCategory,
          accountId: account.accountId,
          canViewAllTickets: true,
          canManageAllTickets: true,
          canConfigureSystem: true,
          canManageUsers: true,
          canManageRoles: true,
          canViewReports: true,
          canManageGroups: true,
          canManageOrganizations: true,
          canMakePrivateComments: true,
          canMakePublicComments: true,
          isDefault: false
        },
        {
          name: 'Admin',
          description: 'Administrative access',
          roleType: 'system' as RoleType,
          roleCategory: 'admin' as RoleCategory,
          accountId: account.accountId,
          canViewAllTickets: true,
          canManageAllTickets: true,
          canConfigureSystem: true,
          canManageUsers: true,
          canManageRoles: true,
          canViewReports: true,
          canManageGroups: true,
          canManageOrganizations: true,
          canMakePrivateComments: true,
          canMakePublicComments: true,
          isDefault: false
        },
        {
          name: 'Senior Agent',
          description: 'Experienced support agent',
          roleType: 'system' as RoleType,
          roleCategory: 'agent' as RoleCategory,
          accountId: account.accountId,
          canViewAllTickets: true,
          canManageAllTickets: false,
          canConfigureSystem: false,
          canManageUsers: false,
          canManageRoles: false,
          canViewReports: true,
          canManageGroups: false,
          canManageOrganizations: false,
          canMakePrivateComments: true,
          canMakePublicComments: true,
          isDefault: false
        },
        {
          name: 'Support Agent',
          description: 'Standard support agent',
          roleType: 'system' as RoleType,
          roleCategory: 'agent' as RoleCategory,
          accountId: account.accountId,
          canViewAllTickets: false,
          canManageAllTickets: false,
          canConfigureSystem: false,
          canManageUsers: false,
          canManageRoles: false,
          canViewReports: false,
          canManageGroups: false,
          canManageOrganizations: false,
          canMakePrivateComments: true,
          canMakePublicComments: true,
          isDefault: true
        },
        {
          name: 'Light Agent',
          description: 'Limited access agent',
          roleType: 'light' as RoleType,
          roleCategory: 'agent' as RoleCategory,
          accountId: account.accountId,
          canViewAllTickets: false,
          canManageAllTickets: false,
          canConfigureSystem: false,
          canManageUsers: false,
          canManageRoles: false,
          canViewReports: false,
          canManageGroups: false,
          canManageOrganizations: false,
          canMakePrivateComments: true,
          canMakePublicComments: false,
          isDefault: false
        }
      ]

      const { data: createdRoles, error: rolesError } = await supabase
        .from('Roles')
        .insert(roles)
        .select()

      if (rolesError) throw rolesError
      console.log(`Created roles for ${account.name}`)

      // 3. Create Groups
      const groups = [
        {
          name: 'Customer Support',
          description: 'General customer support team'
        },
        {
          name: 'Technical Support',
          description: 'Technical issues and product support'
        },
        {
          name: 'Billing Support',
          description: 'Billing and subscription issues'
        }
      ]

      const { data: createdGroups, error: groupsError } = await supabase
        .from('Groups')
        .insert(
          groups.map(group => ({
            ...group,
            accountId: account.accountId
          }))
        )
        .select()

      if (groupsError) throw groupsError
      console.log(`Created groups for ${account.name}`)

      // Set the Customer Support group as the default group for the account
      const customerSupportGroup = createdGroups.find(g => g.name === 'Customer Support')
      if (customerSupportGroup) {
        const { error: updateError } = await supabase
          .from('Accounts')
          .update({ defaultGroupId: customerSupportGroup.groupId })
          .eq('accountId', account.accountId)

        if (updateError) throw updateError
        console.log(`Set default group for ${account.name}`)
      }

      // 4. Create Organizations (without defaultGroupId initially)
      const numOrgs = faker.number.int({ min: 3, max: 8 })
      const organizations = Array.from({ length: numOrgs }, () => ({
        name: faker.company.name(),
        description: faker.company.catchPhrase(),
        notes: faker.company.buzzPhrase(),
        details: JSON.stringify({
          industry: faker.company.buzzNoun(),
          size: faker.helpers.arrayElement(['Small', 'Medium', 'Large']),
          region: faker.location.country()
        }),
        isShared: faker.datatype.boolean(),
        defaultGroupId: null, // Set to null initially
        accountId: account.accountId
      }))

      const { data: createdOrgs, error: orgsError } = await supabase
        .from('Organizations')
        .insert(organizations)
        .select()

      if (orgsError) throw orgsError
      console.log(`Created ${numOrgs} organizations for ${account.name}`)

      // 9. Create Group-Organization Mappings (moved before defaultGroupId update)
      const groupOrgMappings = createdOrgs.flatMap(org => {
        const numGroups = faker.number.int({ min: 1, max: 2 })
        return faker.helpers.arrayElements(createdGroups, numGroups).map(group => ({
          groupId: group.groupId,
          organizationId: org.organizationId
        }))
      })

      const { error: groupOrgError } = await supabase
        .from('GroupOrganizationMapping')
        .insert(groupOrgMappings)

      if (groupOrgError) throw groupOrgError
      console.log(`Created group-organization mappings for ${account.name}`)

      // Update organizations with defaultGroupId
      for (const org of createdOrgs) {
        // Find the first group mapped to this organization
        const orgMapping = groupOrgMappings.find(mapping => mapping.organizationId === org.organizationId)
        const { error: updateError } = await supabase
          .from('Organizations')
          .update({ defaultGroupId: orgMapping?.groupId || createdGroups[0].groupId })
          .eq('organizationId', org.organizationId)
        
        if (updateError) throw updateError
      }
      console.log(`Updated organizations with default groups for ${account.name}`)

      // 7. Add Organization Domains
      const orgDomains = createdOrgs.map(org => ({
        organizationId: org.organizationId,
        domain: faker.internet.domainName()
      }))

      const { error: orgDomainsError } = await supabase
        .from('OrganizationDomains')
        .insert(orgDomains)

      if (orgDomainsError) throw orgDomainsError
      console.log(`Added domains for organizations in ${account.name}`)

      // Create brands for the account
      const brands = [
        {
          accountId: account.accountId,
          name: account.name,
          description: 'Default support brand',
          subdomain: account.subdomain,
          isDefault: true,
          isAgentBrand: false,
          isActive: true
        },
        {
          accountId: account.accountId,
          name: `${account.name} (Agent)`,
          description: 'Internal agent support brand',
          subdomain: `${account.subdomain}-agent`,
          isDefault: false,
          isAgentBrand: true,
          isActive: true
        }
      ]

      const { data: createdBrands, error: brandsError } = await supabase
        .from('Brands')
        .insert(brands)
        .select()

      if (brandsError) throw brandsError
      console.log(`Created brands for ${account.name}`)

      // Create channels for the default brand
      const channels = await createChannelsForAccount(account.accountId, createdBrands[0].brandId);
      console.log(`Created channels for ${account.name}`);

      // Now create user profiles for successfully created auth users
      const users: Database['public']['Tables']['UserProfiles']['Insert'][] = [
        // Owner (if we have at least one user)
        ...(authUsers[0] ? [{
          userId: authUsers[0].id,
          name: faker.person.fullName(),
          email: authUsers[0].email!,
          userType: 'staff' as UserType,
          roleId: createdRoles.find(r => r.roleCategory === 'owner')?.roleId,
          accountId: account.accountId,
          organizationId: null,
          isActive: true,
          isSuspended: false,
          isEmailVerified: true
        }] : []),
        // Admin (if we have at least two users)
        ...(authUsers[1] ? [{
          userId: authUsers[1].id,
          name: faker.person.fullName(),
          email: authUsers[1].email!,
          userType: 'staff' as UserType,
          roleId: createdRoles.find(r => r.roleCategory === 'admin')?.roleId,
          accountId: account.accountId,
          organizationId: null,
          isActive: true,
          isSuspended: false,
          isEmailVerified: true
        }] : []),
        // Senior Agents (if we have enough users)
        ...authUsers.slice(2, 4).map(user => ({
          userId: user.id,
          name: faker.person.fullName(),
          email: user.email!,
          userType: 'staff' as UserType,
          roleId: createdRoles.find(r => r.name === 'Senior Agent')?.roleId,
          accountId: account.accountId,
          organizationId: null,
          isActive: true,
          isSuspended: false,
          isEmailVerified: true
        })),
        // Support Agents (if we have enough users)
        ...authUsers.slice(4, 7).map(user => ({
          userId: user.id,
          name: faker.person.fullName(),
          email: user.email!,
          userType: 'staff' as UserType,
          roleId: createdRoles.find(r => r.name === 'Support Agent')?.roleId,
          accountId: account.accountId,
          organizationId: null,
          isActive: true,
          isSuspended: false,
          isEmailVerified: true
        })),
        // Light Agents (if we have enough users)
        ...authUsers.slice(7, 9).map(user => ({
          userId: user.id,
          name: faker.person.fullName(),
          email: user.email!,
          userType: 'staff' as UserType,
          roleId: createdRoles.find(r => r.name === 'Light Agent')?.roleId,
          accountId: account.accountId,
          organizationId: null,
          isActive: true,
          isSuspended: false,
          isEmailVerified: true
        })),
        // End Users (customers) (remaining users)
        ...authUsers.slice(9).map(user => ({
          userId: user.id,
          name: faker.person.fullName(),
          email: user.email!,
          userType: 'end_user' as UserType,
          roleId: null,
          accountId: account.accountId,
          organizationId: faker.helpers.arrayElement(createdOrgs)?.organizationId,
          isActive: true,
          isSuspended: false,
          isEmailVerified: faker.datatype.boolean()
        }))
      ]

      const { data: createdUsers, error: usersError } = await supabase
        .from('UserProfiles')
        .insert(users)
        .select()

      if (usersError) throw usersError
      console.log(`Created users for ${account.name}`)

      // Update account with owner
      const owner = createdUsers.find(u => u.roleId === createdRoles.find(r => r.roleCategory === 'owner')?.roleId)
      if (!owner) {
        throw new Error(`No owner found for account ${account.name}`)
      }

      const { error: updateError } = await supabase
        .from('Accounts')
        .update({ ownerId: owner.userId })
        .eq('accountId', account.accountId)

      if (updateError) throw updateError
      console.log(`Updated account ${account.name} with owner ID`)

      // 6. Assign Users to Groups
      const staffUsers = createdUsers.filter(u => u.userType === 'staff')
      const userGroupAssignments = staffUsers.flatMap(user => {
        // Randomly assign users to 1-2 groups
        const numGroups = faker.number.int({ min: 1, max: 2 })
        const assignedGroups = faker.helpers.arrayElements(createdGroups, numGroups)
        
        return assignedGroups.map(group => ({
          userId: user.userId,
          groupId: group.groupId,
          isDefault: assignedGroups.indexOf(group) === 0 // First group is default
        }))
      })

      const { error: userGroupsError } = await supabase
        .from('UserGroups')
        .insert(userGroupAssignments)

      if (userGroupsError) throw userGroupsError
      console.log(`Assigned users to groups for ${account.name}`)

      // Create tickets for this account
      console.log(`Creating tickets for ${account.name}...`)

      // Get the default brand for this account
      const { data: defaultBrand, error: brandError } = await supabase
        .from('Brands')
        .select()
        .eq('accountId', account.accountId)
        .eq('isDefault', true)
        .single()

      if (brandError || !defaultBrand) throw new Error(`No default brand found for account ${account.name}`)

      // Get users for this account for assignment
      const accountStaffUsers = createdUsers.filter(u => u.userType === 'staff')
      const accountEndUsers = createdUsers.filter(u => u.userType === 'end_user')

      // Create 10-20 tickets per account with varying properties
      const numTickets = faker.number.int({ min: 10, max: 20 })
      
      // Keep track of problem tickets for linking incidents
      const problemTickets: Database['public']['Tables']['Tickets']['Row'][] = []
      
      for (let i = 0; i < numTickets; i++) {
        // Select a random requester from end users
        const requester = faker.helpers.arrayElement(accountEndUsers)
        
        // Randomly decide if ticket should be assigned
        const shouldAssign = faker.datatype.boolean()
        const assignee = shouldAssign ? faker.helpers.arrayElement(accountStaffUsers) : null
        const assigneeGroup = shouldAssign && !assignee ? faker.helpers.arrayElement(createdGroups) : null

        // Determine ticket type - ensure we have some problem tickets before creating incidents
        let ticketType: 'question' | 'incident' | 'problem' | 'task'
        if (problemTickets.length === 0) {
          // First few tickets should include some problems
          ticketType = faker.helpers.arrayElement(['question', 'problem', 'task', 'problem'])
        } else {
          ticketType = faker.helpers.arrayElement(['question', 'incident', 'problem', 'task'])
        }

        // Generate ticket data
        const ticketData = {
          accountId: account.accountId,
          brandId: defaultBrand.brandId,
          requesterId: requester.userId,
          submitterId: requester.userId, // Usually same as requester
          assigneeId: assignee?.userId || null,
          assigneeGroupId: assigneeGroup?.groupId || null,
          subject: faker.helpers.arrayElement([
            'Cannot login to the application',
            'Need help with integration',
            'Billing question',
            'Feature request: Dark mode',
            'System is running slow',
            'Error when uploading files',
            'Password reset not working',
            'API documentation unclear',
            'Mobile app crashes on startup',
            'Need to upgrade subscription'
          ]),
          description: faker.lorem.paragraphs(2),
          status: faker.helpers.arrayElement(['new', 'open', 'pending', 'on_hold', 'solved', 'closed']),
          type: ticketType,
          priority: faker.helpers.arrayElement(['low', 'normal', 'high', 'urgent']),
          channelId: faker.helpers.arrayElement(channels).channelId,
          isPublic: faker.datatype.boolean(0.8), // 80% chance of being public
          createdAt: faker.date.past({ years: 1 }).toISOString(),
          // If this is an incident ticket, link it to a random problem ticket
          problemTicketId: ticketType === 'incident' && problemTickets.length > 0 
            ? faker.helpers.arrayElement(problemTickets).ticketId 
            : null
        }

        // Create the ticket
        const { data: ticket, error: ticketError } = await supabase
          .from('Tickets')
          .insert(ticketData)
          .select()
          .single()

        if (ticketError || !ticket) throw ticketError

        // If this is a problem ticket, add it to our list for future incident references
        if (ticket.type === 'problem') {
          problemTickets.push(ticket)
        }

        // Add 0-5 comments to the ticket
        const numComments = faker.number.int({ min: 0, max: 5 })
        const commentPromises = Array.from({ length: numComments }, async () => {
          // Randomly choose between requester and assignee for comment author
          const possibleAuthors = [
            requester,
            ...(assignee ? [assignee] : []),
            ...accountStaffUsers.filter(u => u.userId !== assignee?.userId)
          ]
          const commentAuthor = faker.helpers.arrayElement(possibleAuthors)

          const commentData = {
            ticketId: ticket.ticketId,
            authorId: commentAuthor.userId,
            content: faker.lorem.paragraph(),
            isPublic: faker.datatype.boolean(0.7), // 70% chance of being public
            createdAt: faker.date.between({ 
              from: ticket.createdAt ? new Date(ticket.createdAt) : new Date(Date.now() - 24 * 60 * 60 * 1000), // Default to 24h ago if no createdAt
              to: new Date() 
            }).toISOString()
          }

          return supabase.from('TicketComments').insert(commentData)
        })

        await Promise.all(commentPromises)

        // Add followers (30% chance per staff user)
        const followerPromises = accountStaffUsers.map(async (user) => {
          if (faker.datatype.boolean(0.3)) {
            return supabase
              .from('TicketFollowers')
              .insert({
                ticketId: ticket.ticketId,
                userId: user.userId
              })
          }
        })

        await Promise.all(followerPromises)

        // Add CCs (20% chance per staff user)
        const ccPromises = accountStaffUsers.map(async (user) => {
          if (faker.datatype.boolean(0.2)) {
            return supabase
              .from('TicketCCs')
              .insert({
                ticketId: ticket.ticketId,
                userId: user.userId
              })
          }
        })

        await Promise.all(ccPromises)

        // Add custom field values (if any exist)
        const { data: customFields } = await supabase
          .from('CustomFields')
          .select()
          .eq('accountId', account.accountId)

        if (customFields && customFields.length > 0) {
          const customFieldPromises = customFields.map(field => {
            let value
            switch (field.fieldType) {
              case 'text':
                value = faker.lorem.sentence()
                break
              case 'number':
                value = faker.number.int({ min: 1, max: 100 })
                break
              case 'decimal':
                value = faker.number.float({ min: 0, max: 100, fractionDigits: 2 })
                break
              case 'date':
                value = faker.date.recent().toISOString()
                break
              case 'boolean':
                value = faker.datatype.boolean()
                break
              case 'dropdown':
                const fieldOptions = typeof field.options === 'object' && field.options !== null ? 
                  (field.options as { options?: string[] }).options : undefined
                if (fieldOptions) {
                  value = faker.helpers.arrayElement(fieldOptions)
                }
                break
              default:
                value = null
            }

            if (value !== null) {
              return supabase
                .from('TicketCustomFieldValues')
                .insert({
                  ticketId: ticket.ticketId,
                  fieldId: field.fieldId,
                  value: { value }
                })
            }
          })

          await Promise.all(customFieldPromises.filter(Boolean))
        }

        // Mark ticket as read by assignee and some random staff (50% chance)
        if (assignee) {
          await supabase
            .from('TicketReadStatus')
            .insert({
              ticketId: ticket.ticketId,
              userId: assignee.userId,
              lastReadAt: new Date().toISOString()
            })
        }

        const readStatusPromises = accountStaffUsers
          .filter(u => u.userId !== assignee?.userId)
          .map(async (user) => {
            if (faker.datatype.boolean(0.5)) {
              return supabase
                .from('TicketReadStatus')
                .insert({
                  ticketId: ticket.ticketId,
                  userId: user.userId,
                  lastReadAt: new Date().toISOString()
                })
            }
          })

        await Promise.all(readStatusPromises)
      }

      console.log(`Created ${numTickets} tickets for ${account.name}`)
    }

    console.log('Company data seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding company data:', error)
    throw error
  }
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...')

    // Check if JSON files exist
    const suiteFeaturesPath = path.join(__dirname, '../docs/zendesk/plans_and_features/suite_features.json')
    const buildYourOwnFeaturesPath = path.join(__dirname, '../docs/zendesk/plans_and_features/build_your_own_features.json')

    if (!fs.existsSync(suiteFeaturesPath)) {
      throw new Error(`Suite features file not found at: ${suiteFeaturesPath}`)
    }
    if (!fs.existsSync(buildYourOwnFeaturesPath)) {
      throw new Error(`Build your own features file not found at: ${buildYourOwnFeaturesPath}`)
    }

    // Read JSON files
    console.log('Reading JSON files...')
    let suiteFeatures: PlansJson
    let buildYourOwnFeatures: PlansJson

    try {
      suiteFeatures = JSON.parse(fs.readFileSync(suiteFeaturesPath, 'utf8'))
      buildYourOwnFeatures = JSON.parse(fs.readFileSync(buildYourOwnFeaturesPath, 'utf8'))
    } catch (error) {
      throw new Error(`Error reading JSON files: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Validate JSON data
    if (!suiteFeatures['Suite Team']) {
      throw new Error('Missing Suite Team data in suite_features.json')
    }
    if (!buildYourOwnFeatures['Support Team']) {
      throw new Error('Missing Support Team data in build_your_own_features.json')
    }

    // Create plans
    console.log('Creating plans...')
    const plansData: Database['public']['Tables']['Plans']['Insert'][] = [
      // Suite plans
      {
        name: 'Suite Team',
        description: 'Essential support tools for growing teams',
        type: 'suite',
        monthlySubscriptionPerAgent: Number(suiteFeatures['Suite Team']['Monthly Subscription Term (per agent per month)'].replace('$', '')),
        annualSubscriptionPerAgent: Number(suiteFeatures['Suite Team']['Annual Subscription Term (per agent per month)'].replace('$', '')),
      },
      {
        name: 'Suite Growth',
        description: 'Advanced features for scaling support operations',
        type: 'suite',
        monthlySubscriptionPerAgent: Number(suiteFeatures['Suite Growth']['Monthly Subscription Term (per agent per month)'].replace('$', '')),
        annualSubscriptionPerAgent: Number(suiteFeatures['Suite Growth']['Annual Subscription Term (per agent per month)'].replace('$', '')),
      },
      {
        name: 'Suite Professional',
        description: 'Complete solution for professional support teams',
        type: 'suite',
        monthlySubscriptionPerAgent: Number(suiteFeatures['Suite Professional']['Monthly Subscription Term (per agent per month)'].replace('$', '')),
        annualSubscriptionPerAgent: Number(suiteFeatures['Suite Professional']['Annual Subscription Term (per agent per month)'].replace('$', '')),
      },
      // Support plans
      {
        name: 'Support Team',
        description: 'Essential support tools for small teams',
        type: 'buildYourOwn',
        monthlySubscriptionPerAgent: Number(buildYourOwnFeatures['Support Team']['Monthly Subscription Term (per agent per month)'].replace('$', '')),
        annualSubscriptionPerAgent: Number(buildYourOwnFeatures['Support Team']['Annual Subscription Term (per agent per month)'].replace('$', '')),
      },
      {
        name: 'Support Professional',
        description: 'Advanced features for growing support teams',
        type: 'buildYourOwn',
        monthlySubscriptionPerAgent: Number(buildYourOwnFeatures['Support Professional']['Monthly Subscription Term (per agent per month)'].replace('$', '')),
        annualSubscriptionPerAgent: Number(buildYourOwnFeatures['Support Professional']['Annual Subscription Term (per agent per month)'].replace('$', '')),
      }
    ]

    // Log the plans data for debugging
    console.log('Plans data to insert:', JSON.stringify(plansData, null, 2))

    const { data: plans, error: plansError, status, statusText } = await supabase
      .from('Plans')
      .insert(plansData)
      .select()
    
    if (plansError || !plans) {
      console.error('Error creating plans:', {
        error: plansError,
        status,
        statusText,
        data: plans
      })
      throw new Error(`Failed to create plans: ${JSON.stringify({
        error: plansError,
        status,
        statusText,
        data: plans
      })}`)
    }
    if (plans.length === 0) {
      throw new Error('No plans were created')
    }
    console.log('Plans created successfully:', plans.length, 'plans')

    // Create features
    console.log('Creating features...')
    const featuresSet = new Set<string>()
    
    // Extract features from Suite plans
    Object.values(suiteFeatures).forEach(plan => {
      Object.entries(plan as PlanData).forEach(([feature, value]) => {
        if (feature !== 'Annual Subscription Term (per agent per month)' && 
            feature !== 'Monthly Subscription Term (per agent per month)') {
          featuresSet.add(feature)
        }
      })
    })

    // Extract features from Support plans
    Object.values(buildYourOwnFeatures).forEach(plan => {
      Object.entries(plan as PlanData).forEach(([feature, value]) => {
        if (feature !== 'Annual Subscription Term (per agent per month)' && 
            feature !== 'Monthly Subscription Term (per agent per month)') {
          featuresSet.add(feature)
        }
      })
    })

    const featuresData: Database['public']['Tables']['Features']['Insert'][] = Array.from(featuresSet).map(feature => ({
      name: feature,
      description: null,
      isAddOn: false
    }))

    const { data: features, error: featuresError } = await supabase
      .from('Features')
      .insert(featuresData)
      .select()
    
    if (featuresError) {
      console.error('Error creating features:', featuresError)
      throw new Error(`Failed to create features: ${JSON.stringify(featuresError)}`)
    }
    if (!features || features.length === 0) {
      throw new Error('No features were created')
    }
    console.log('Features created successfully')

    // Create plan-feature mappings
    console.log('Creating plan-feature mappings...')
    const planFeaturesMappings: Database['public']['Tables']['PlanFeatures']['Insert'][] = []

    // Map Suite features
    for (const [planName, planFeatures] of Object.entries(suiteFeatures)) {
      const plan = plans.find(p => p.name === planName)
      if (!plan) continue

      for (const [featureName, value] of Object.entries(planFeatures as PlanData)) {
        if (featureName === 'Annual Subscription Term (per agent per month)' || 
            featureName === 'Monthly Subscription Term (per agent per month)') continue

        const feature = features.find(f => f.name === featureName)
        if (!feature) continue

        let accessLevel: string | null = null
        if (typeof value === 'boolean') {
          accessLevel = value ? 'enabled' : 'disabled'
        } else if (value === 'Add-on') {
          accessLevel = 'addon'
        } else if (value !== null && value !== undefined) {
          // Normalize and truncate long values
          const normalizedValue = String(value).trim()
          if (normalizedValue.length > 50) {
            // If it's a number with decimals, try to format it
            const numValue = parseFloat(normalizedValue)
            if (!isNaN(numValue)) {
              accessLevel = numValue.toString()
            } else {
              // Otherwise truncate to 47 chars and add ...
              accessLevel = normalizedValue.substring(0, 47) + '...'
            }
          } else {
            accessLevel = normalizedValue
          }
        }

        planFeaturesMappings.push({
          planId: plan.planId,
          featureId: feature.featureId,
          accessLevel
        })
      }
    }

    // Map Support features
    for (const [planName, planFeatures] of Object.entries(buildYourOwnFeatures)) {
      const plan = plans.find(p => p.name === planName)
      if (!plan) continue

      for (const [featureName, value] of Object.entries(planFeatures as PlanData)) {
        if (featureName === 'Annual Subscription Term (per agent per month)' || 
            featureName === 'Monthly Subscription Term (per agent per month)') continue

        const feature = features.find(f => f.name === featureName)
        if (!feature) continue

        let accessLevel: string | null = null
        if (typeof value === 'boolean') {
          accessLevel = value ? 'enabled' : 'disabled'
        } else if (value === 'Add-on') {
          accessLevel = 'addon'
        } else if (value !== null && value !== undefined) {
          // Normalize and truncate long values
          const normalizedValue = String(value).trim()
          if (normalizedValue.length > 50) {
            // If it's a number with decimals, try to format it
            const numValue = parseFloat(normalizedValue)
            if (!isNaN(numValue)) {
              accessLevel = numValue.toString()
            } else {
              // Otherwise truncate to 47 chars and add ...
              accessLevel = normalizedValue.substring(0, 47) + '...'
            }
          } else {
            accessLevel = normalizedValue
          }
        }

        planFeaturesMappings.push({
          planId: plan.planId,
          featureId: feature.featureId,
          accessLevel
        })
      }
    }

    const { error: planFeaturesError } = await supabase
      .from('PlanFeatures')
      .insert(planFeaturesMappings)
    if (planFeaturesError) throw planFeaturesError
    console.log('Plan-feature mappings created successfully')

    // Seed company data
    await seedCompanyData()

    console.log('Database seeding completed successfully!')
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error seeding database:', error.message)
      throw error
    } else {
      console.error('Unknown error seeding database:', error)
      throw new Error(`Unknown error seeding database: ${JSON.stringify(error)}`)
    }
  }
}

// Export the seed function
export default seedDatabase

await seedDatabase()