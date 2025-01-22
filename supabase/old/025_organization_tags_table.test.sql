begin;
select plan(7);  -- 1 table test + (3 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the OrganizationTags table exists
select has_table('OrganizationTags');

-- Test if each column exists and has the correct type
select has_column('OrganizationTags', 'organizationId');
select col_type_is('OrganizationTags', 'organizationId', 'uuid');

select has_column('OrganizationTags', 'tag');
select col_type_is('OrganizationTags', 'tag', 'character varying(50)');

select has_column('OrganizationTags', 'createdAt');
select col_type_is('OrganizationTags', 'createdAt', 'timestamp without time zone');

select * from finish();
rollback; 