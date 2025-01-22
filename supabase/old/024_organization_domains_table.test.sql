begin;
select plan(7);  -- 1 table test + (3 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the OrganizationDomains table exists
select has_table('OrganizationDomains');

-- Test if each column exists and has the correct type
select has_column('OrganizationDomains', 'organizationId');
select col_type_is('OrganizationDomains', 'organizationId', 'uuid');

select has_column('OrganizationDomains', 'domain');
select col_type_is('OrganizationDomains', 'domain', 'character varying(255)');

select has_column('OrganizationDomains', 'createdAt');
select col_type_is('OrganizationDomains', 'createdAt', 'timestamp without time zone');

select * from finish();
rollback; 