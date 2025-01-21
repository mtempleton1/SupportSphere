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

// Company seed data
const companies = [
  {
    name: 'TechFlow Solutions',
    subdomain: 'techflow',
    industry: 'Technology',
    description: 'Enterprise software solutions provider',
    size: 'Large',
    useCase: 'Customer support for SaaS products'
  },
  {
    name: 'GreenLeaf Organics',
    subdomain: 'greenleaf',
    industry: 'Food & Agriculture',
    description: 'Organic food distribution company',
    size: 'Medium',
    useCase: 'Order management and supplier support'
  },
  {
    name: 'SwiftCare Medical',
    subdomain: 'swiftcare',
    industry: 'Healthcare',
    description: 'Telemedicine platform provider',
    size: 'Large',
    useCase: 'Patient support and appointment management'
  },
  {
    name: 'EduTech Innovators',
    subdomain: 'edutech',
    industry: 'Education',
    description: 'Online learning platform',
    size: 'Small',
    useCase: 'Student and teacher support'
  },
  {
    name: 'FinServe Global',
    subdomain: 'finserve',
    industry: 'Financial Services',
    description: 'Digital banking solutions',
    size: 'Large',
    useCase: 'Customer service for banking products'
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
    
    // Create accounts and their associated data
    for (const company of companies) {
      console.log(`Creating account for ${company.name}...`)
      
      // 1. Create Account
      const { data: account, error: accountError } = await supabase
        .from('Accounts')
        .insert({
          name: company.name,
          subdomain: company.subdomain,
          planId: null // Will be updated later
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
          description: 'General customer support team',
          isDefault: true
        },
        {
          name: 'Technical Support',
          description: 'Technical issues and product support',
          isDefault: false
        },
        {
          name: 'Billing Support',
          description: 'Billing and subscription issues',
          isDefault: false
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

      // 4. Create Organizations
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
        defaultGroupId: createdGroups[0].groupId,
        accountId: account.accountId
      }))

      const { data: createdOrgs, error: orgsError } = await supabase
        .from('Organizations')
        .insert(organizations)
        .select()

      if (orgsError) throw orgsError
      console.log(`Created ${numOrgs} organizations for ${account.name}`)

      // 5. Create Users with different roles
      // Reduce number of users to create
      const numEndUsers = 5 // Reduced from 10
      const totalUsers = 11 + numEndUsers // 6 staff + 5 end users
      const userEmails = Array.from({ length: totalUsers }, () => faker.internet.email())
      const userPasswords = Array.from({ length: totalUsers }, () => faker.internet.password())
      
      // Create auth users sequentially with longer delays
      console.log('Creating auth users...')
      const authUsers: User[] = []
      for (let i = 0; i < userEmails.length; i++) {
        try {
          // Add a longer delay between user creations (1 second)
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }

          console.log(`Creating auth user ${i + 1} of ${userEmails.length}: ${userEmails[i]}`)
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: userEmails[i],
            password: userPasswords[i],
            email_confirm: true
          })

          if (authError) {
            console.error(`Error creating auth user ${i + 1}:`, authError)
            // Skip this user and continue with the next one instead of throwing
            continue
          }

          if (!authUser?.user) {
            console.error(`No user returned when creating auth user ${i + 1}`)
            continue
          }

          authUsers.push(authUser.user)
          console.log(`Successfully created auth user ${i + 1}`)
        } catch (error) {
          console.error(`Failed to create auth user ${i + 1}:`, error)
          // Skip this user and continue with the next one
          continue
        }
      }

      // Only proceed if we have at least some users created
      if (authUsers.length === 0) {
        throw new Error('Failed to create any auth users')
      }

      // Now create user profiles for successfully created auth users
      const users: Database['public']['Tables']['UserProfiles']['Insert'][] = [
        // Owner (if we have at least one user)
        ...(authUsers[0] ? [{
          userId: authUsers[0].id,
          name: faker.person.fullName(),
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

      // 8. Add Organization Tags
      const orgTags = createdOrgs.flatMap(org => {
        const numTags = faker.number.int({ min: 2, max: 5 })
        return Array.from({ length: numTags }, () => ({
          organizationId: org.organizationId,
          tag: faker.helpers.arrayElement([
            'VIP',
            'Enterprise',
            'SMB',
            'Strategic',
            'Partner',
            'Prospect',
            'Trial',
            'Churned',
            'At Risk',
            'High Value'
          ])
        }))
      })

      const { error: orgTagsError } = await supabase
        .from('OrganizationTags')
        .insert(orgTags)

      if (orgTagsError) throw orgTagsError
      console.log(`Added tags for organizations in ${account.name}`)

      // 9. Create Group-Organization Mappings
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

    // Reset the entire database
    await resetDatabase()

    // Read JSON files
    const suiteFeatures = JSON.parse(fs.readFileSync(path.join(__dirname, '../ref/zendesk/plans_and_features/suite_features.json'), 'utf8')) as PlansJson
    const buildYourOwnFeatures = JSON.parse(fs.readFileSync(path.join(__dirname, '../ref/zendesk/plans_and_features/build_your_own_features.json'), 'utf8')) as PlansJson

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

    const { data: plans, error: plansError } = await supabase
      .from('Plans')
      .insert(plansData)
      .select()
    if (plansError) throw plansError
    console.log('Plans created successfully')

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
    if (featuresError) throw featuresError
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
    console.error('Error seeding database:', error)
    throw error
  }
}

// Export the seed function
export default seedDatabase

await seedDatabase()