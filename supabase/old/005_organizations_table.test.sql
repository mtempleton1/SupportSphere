begin;
select plan(22);  -- 1 table test + (10 columns * 2 tests each) + 1 PK test

-- Test if the Organizations table exists
select has_table('Organizations');

-- Test if each column exists and has the correct type
select has_column('Organizations', 'organizationId');
select col_type_is('Organizations', 'organizationId', 'uuid');
select col_is_pk('Organizations', 'organizationId');

select has_column('Organizations', 'accountId');
select col_type_is('Organizations', 'accountId', 'uuid');

select has_column('Organizations', 'name');
select col_type_is('Organizations', 'name', 'character varying(255)');

select has_column('Organizations', 'description');
select col_type_is('Organizations', 'description', 'text');

select has_column('Organizations', 'notes');
select col_type_is('Organizations', 'notes', 'text');

select has_column('Organizations', 'details');
select col_type_is('Organizations', 'details', 'text');

select has_column('Organizations', 'isShared');
select col_type_is('Organizations', 'isShared', 'boolean');

select has_column('Organizations', 'defaultGroupId');
select col_type_is('Organizations', 'defaultGroupId', 'uuid');

select has_column('Organizations', 'createdAt');
select col_type_is('Organizations', 'createdAt', 'timestamp without time zone');

select has_column('Organizations', 'updatedAt');
select col_type_is('Organizations', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 