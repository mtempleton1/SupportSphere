import { createClient } from '@supabase/supabase-js'
import { faker } from '@faker-js/faker'
import dotenv from 'dotenv'

dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to generate random enum values
const randomEnum = <T extends Record<string, string>>(enumObj: T): T[keyof T] => {
  const values = Object.values(enumObj)
  return values[Math.floor(Math.random() * values.length)] as T[keyof T]
}

// Define enums from the database
const RoleType = {
  system: 'system',
  custom: 'custom',
  light: 'light',
  contributor: 'contributor'
} as const

const RoleCategory = {
  end_user: 'end_user',
  agent: 'agent',
  admin: 'admin',
  owner: 'owner'
} as const

// Sample data for plans
const plans = [
  {
    name: 'Suite Team',
    description: 'Essential support tools for growing teams',
    monthlyPrice: 49,
    features: ['Basic ticket management', 'Email & web channels', 'Basic help center'],
    maxAgents: 3
  },
  {
    name: 'Suite Growth',
    description: 'Enhanced support tools with automation',
    monthlyPrice: 79,
    features: ['Advanced ticket management', 'Multiple channels', 'Full help center', 'Basic automation'],
    maxAgents: 10
  },
  {
    name: 'Suite Professional',
    description: 'Professional omnichannel support solution',
    monthlyPrice: 99,
    features: ['Enterprise ticket management', 'All channels', 'Advanced help center', 'Full automation', 'Custom analytics'],
    maxAgents: 100
  }
]

// Sample company data
const companies = [
  { name: 'TechFlow Solutions', industry: 'Technology', size: 'Medium' },
  { name: 'GreenLeaf Organics', industry: 'Food & Beverage', size: 'Small' },
  { name: 'BuildRight Construction', industry: 'Construction', size: 'Large' },
  { name: 'HealthFirst Medical', industry: 'Healthcare', size: 'Large' },
  { name: 'EduSmart Academy', industry: 'Education', size: 'Medium' },
  { name: 'FastTrack Logistics', industry: 'Transportation', size: 'Medium' },
  { name: 'CloudNine Software', industry: 'Technology', size: 'Small' },
  { name: 'BankSecure Financial', industry: 'Finance', size: 'Large' }
]

// Define types for our entities
interface Plan {
  planId: string
  name: string
  description: string
  monthlyPrice: number
  features: string[]
  maxAgents: number
  isActive: boolean
}

interface Account {
  accountId: string
  name: string
  industry: string
  size: string
  planId: string
  status: string
  billingEmail: string
  createdAt: string
}

interface Role {
  roleId: string
  name: string
  type: string
  category: string
  description: string
  permissions: Record<string, any>
  isSystem: boolean
}

interface Organization {
  organizationId: string
  accountId: string
  name: string
  domain: string
  details: Record<string, any>
}

interface Group {
  groupId: string
  accountId: string
  organizationId: string
  name: string
  description: string
}

interface UserProfile {
  userId: string
  accountId: string
  organizationId: string
  roleId: string
  email: string
  name: string
  status: string
  preferences: Record<string, any>
}

// Seed Plans
async function seedPlans(): Promise<Plan[]> {
  const seededPlans: Plan[] = []
  
  for (const plan of plans) {
    const { data, error } = await supabase
      .from('Plans')
      .insert({
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        features: plan.features,
        maxAgents: plan.maxAgents,
        isActive: true
      })
      .select()
    
    if (error) throw error
    seededPlans.push(data[0])
  }
  
  return seededPlans
}

// Seed Accounts
async function seedAccounts(seededPlans: Plan[]): Promise<Account[]> {
  const seededAccounts: Account[] = []
  
  for (const company of companies) {
    const randomPlan = seededPlans[Math.floor(Math.random() * seededPlans.length)]
    
    const { data, error } = await supabase
      .from('Accounts')
      .insert({
        name: company.name,
        industry: company.industry,
        size: company.size,
        planId: randomPlan.planId,
        status: 'active',
        billingEmail: `billing@${company.name.toLowerCase().replace(/\s+/g, '')}.com`,
        createdAt: new Date().toISOString()
      })
      .select()
    
    if (error) throw error
    seededAccounts.push(data[0])
  }
  
  return seededAccounts
}

// Seed Roles
async function seedRoles(): Promise<Role[]> {
  const defaultRoles = [
    { name: 'End User', type: 'system', category: 'end_user' },
    { name: 'Agent', type: 'system', category: 'agent' },
    { name: 'Admin', type: 'system', category: 'admin' },
    { name: 'Owner', type: 'system', category: 'owner' },
    { name: 'Light Agent', type: 'light', category: 'agent' },
    { name: 'Contributor', type: 'contributor', category: 'agent' }
  ]
  
  const seededRoles: Role[] = []
  
  for (const role of defaultRoles) {
    const { data, error } = await supabase
      .from('Roles')
      .insert({
        name: role.name,
        type: role.type,
        category: role.category,
        description: `Default ${role.name} role`,
        permissions: {},
        isSystem: role.type === 'system'
      })
      .select()
    
    if (error) throw error
    seededRoles.push(data[0])
  }
  
  return seededRoles
}

// Seed Organizations and Groups
async function seedOrganizationsAndGroups(accounts: Account[]): Promise<{ organizations: Organization[]; groups: Group[] }> {
  const organizations: Organization[] = []
  const groups: Group[] = []
  
  for (const account of accounts) {
    // Create 2-4 organizations per account
    const numOrgs = Math.floor(Math.random() * 3) + 2
    
    for (let i = 0; i < numOrgs; i++) {
      const { data: orgData, error: orgError } = await supabase
        .from('Organizations')
        .insert({
          accountId: account.accountId,
          name: `${faker.company.name()} ${i + 1}`,
          domain: faker.internet.domainName(),
          details: {
            industry: faker.company.catchPhrase(),
            size: faker.helpers.arrayElement(['Small', 'Medium', 'Large'])
          }
        })
        .select()
      
      if (orgError) throw orgError
      organizations.push(orgData[0])
      
      // Create 1-3 groups per organization
      const numGroups = Math.floor(Math.random() * 3) + 1
      
      for (let j = 0; j < numGroups; j++) {
        const { data: groupData, error: groupError } = await supabase
          .from('Groups')
          .insert({
            accountId: account.accountId,
            organizationId: orgData[0].organizationId,
            name: faker.helpers.arrayElement([
              'Support Team',
              'Sales Support',
              'Technical Support',
              'Customer Success',
              'VIP Support'
            ]),
            description: faker.company.catchPhrase()
          })
          .select()
        
        if (groupError) throw groupError
        groups.push(groupData[0])
      }
    }
  }
  
  return { organizations, groups }
}

// Seed Users
async function seedUsers(
  accounts: Account[],
  organizations: Organization[],
  roles: Role[]
): Promise<UserProfile[]> {
  const seededUsers: UserProfile[] = []
  const endUserRole = roles.find(r => r.name === 'End User')
  const agentRole = roles.find(r => r.name === 'Agent')
  const adminRole = roles.find(r => r.name === 'Admin')
  
  if (!endUserRole || !agentRole || !adminRole) {
    throw new Error('Required roles not found')
  }
  
  for (const org of organizations) {
    const account = accounts.find(a => a.accountId === org.accountId)
    if (!account) continue
    
    // Create 1 admin per organization
    const { data: adminData, error: adminError } = await supabase
      .from('UserProfiles')
      .insert({
        accountId: account.accountId,
        organizationId: org.organizationId,
        roleId: adminRole.roleId,
        email: `admin@${org.domain}`,
        name: faker.person.fullName(),
        status: 'active',
        preferences: {
          language: 'en',
          timezone: 'UTC'
        }
      })
      .select()
    
    if (adminError) throw adminError
    seededUsers.push(adminData[0])
    
    // Create 2-5 agents per organization
    const numAgents = Math.floor(Math.random() * 4) + 2
    for (let i = 0; i < numAgents; i++) {
      const { data: agentData, error: agentError } = await supabase
        .from('UserProfiles')
        .insert({
          accountId: account.accountId,
          organizationId: org.organizationId,
          roleId: agentRole.roleId,
          email: `agent${i + 1}@${org.domain}`,
          name: faker.person.fullName(),
          status: 'active',
          preferences: {
            language: 'en',
            timezone: 'UTC'
          }
        })
        .select()
      
      if (agentError) throw agentError
      seededUsers.push(agentData[0])
    }
    
    // Create 5-10 end users per organization
    const numEndUsers = Math.floor(Math.random() * 6) + 5
    for (let i = 0; i < numEndUsers; i++) {
      const { data: userData, error: userError } = await supabase
        .from('UserProfiles')
        .insert({
          accountId: account.accountId,
          organizationId: org.organizationId,
          roleId: endUserRole.roleId,
          email: faker.internet.email(),
          name: faker.person.fullName(),
          status: 'active',
          preferences: {
            language: 'en',
            timezone: 'UTC'
          }
        })
        .select()
      
      if (userError) throw userError
      seededUsers.push(userData[0])
    }
  }
  
  return seededUsers
}

// Seed Tickets
async function seedTickets(users: UserProfile[], groups: Group[], roles: Role[]) {
  const ticketTypes = ['question', 'incident', 'problem', 'task']
  const ticketPriorities = ['low', 'normal', 'high', 'urgent']
  const ticketStatuses = ['new', 'open', 'pending', 'solved', 'closed']
  
  const endUsers = users.filter(u => u.roleId === roles.find(r => r.name === 'End User')?.roleId)
  const agents = users.filter(u => u.roleId === roles.find(r => r.name === 'Agent')?.roleId)
  
  for (const user of endUsers) {
    // Create 1-5 tickets per end user
    const numTickets = Math.floor(Math.random() * 5) + 1
    
    for (let i = 0; i < numTickets; i++) {
      const assignedGroup = groups.find(g => g.organizationId === user.organizationId)
      const assignedAgent = agents.find(a => a.organizationId === user.organizationId)
      
      if (!assignedGroup || !assignedAgent) continue
      
      const { data: ticketData, error: ticketError } = await supabase
        .from('Tickets')
        .insert({
          accountId: user.accountId,
          requesterId: user.userId,
          assigneeId: assignedAgent.userId,
          groupId: assignedGroup.groupId,
          subject: faker.lorem.sentence(),
          description: faker.lorem.paragraphs(2),
          type: faker.helpers.arrayElement(ticketTypes),
          priority: faker.helpers.arrayElement(ticketPriorities),
          status: faker.helpers.arrayElement(ticketStatuses),
          tags: [faker.lorem.word(), faker.lorem.word()],
          createdAt: faker.date.past(),
          updatedAt: new Date().toISOString()
        })
        .select()
      
      if (ticketError) throw ticketError
      
      // Add 1-3 comments per ticket
      const numComments = Math.floor(Math.random() * 3) + 1
      for (let j = 0; j < numComments; j++) {
        const isPublic = Math.random() > 0.3 // 70% chance of public comment
        const commentAuthor = isPublic ? 
          faker.helpers.arrayElement([assignedAgent, user]) :
          assignedAgent
        
        const { error: commentError } = await supabase
          .from('TicketComments')
          .insert({
            ticketId: ticketData[0].ticketId,
            authorId: commentAuthor.userId,
            content: faker.lorem.paragraph(),
            isPublic,
            createdAt: faker.date.past(),
            updatedAt: new Date().toISOString()
          })
        
        if (commentError) throw commentError
      }
    }
  }
}

// Main seeding function
async function seedDatabase() {
  console.log('Starting database seeding...')
  
  try {
    // Clear existing data (if needed)
    await clearExistingData()
    
    // Seed plans
    const seededPlans = await seedPlans()
    console.log('Plans seeded successfully')
    
    // Seed accounts
    const seededAccounts = await seedAccounts(seededPlans)
    console.log('Accounts seeded successfully')
    
    // Seed roles
    const seededRoles = await seedRoles()
    console.log('Roles seeded successfully')
    
    // Seed organizations and groups
    const { organizations, groups } = await seedOrganizationsAndGroups(seededAccounts)
    console.log('Organizations and groups seeded successfully')
    
    // Seed users
    const seededUsers = await seedUsers(seededAccounts, organizations, seededRoles)
    console.log('Users seeded successfully')
    
    // Seed tickets and related data
    await seedTickets(seededUsers, groups, seededRoles)
    console.log('Tickets and related data seeded successfully')
    
    console.log('Database seeding completed successfully!')
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

// Function to clear existing data
async function clearExistingData() {
  // Delete in reverse order of dependencies
  await supabase.from('KBArticleComments').delete().neq('commentId', '')
  await supabase.from('KBArticleSubscriptions').delete().neq('articleId', '')
  await supabase.from('KBArticleSections').delete().neq('articleId', '')
  await supabase.from('KBArticles').delete().neq('articleId', '')
  await supabase.from('KBSections').delete().neq('sectionId', '')
  await supabase.from('KBCategories').delete().neq('categoryId', '')
  await supabase.from('TicketComments').delete().neq('commentId', '')
  await supabase.from('Tickets').delete().neq('ticketId', '')
  await supabase.from('UserProfiles').delete().neq('userId', '')
  await supabase.from('Groups').delete().neq('groupId', '')
  await supabase.from('Organizations').delete().neq('organizationId', '')
  await supabase.from('Roles').delete().neq('roleId', '')
  await supabase.from('Accounts').delete().neq('accountId', '')
  await supabase.from('Plans').delete().neq('planId', '')
}

// Run the seeding
seedDatabase().catch(console.error)
