begin;
select plan(5);  -- 1 table test + (2 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the GroupOrganizationMapping table exists
select has_table('GroupOrganizationMapping');

-- Test if each column exists and has the correct type
select has_column('GroupOrganizationMapping', 'groupId');
select col_type_is('GroupOrganizationMapping', 'groupId', 'uuid');

select has_column('GroupOrganizationMapping', 'organizationId');
select col_type_is('GroupOrganizationMapping', 'organizationId', 'uuid');

select * from finish();
rollback; 