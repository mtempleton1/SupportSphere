begin;
select plan(14);  -- 1 table test + (5 columns * 2 tests each) + 1 PK test

-- Test if the Permissions table exists
select has_table('Permissions');

-- Test if each column exists and has the correct type
select has_column('Permissions', 'permissionId');
select col_type_is('Permissions', 'permissionId', 'uuid');
select col_is_pk('Permissions', 'permissionId');

select has_column('Permissions', 'name');
select col_type_is('Permissions', 'name', 'character varying(255)');

select has_column('Permissions', 'description');
select col_type_is('Permissions', 'description', 'text');

select has_column('Permissions', 'category');
select col_type_is('Permissions', 'category', 'character varying(50)');

select has_column('Permissions', 'createdAt');
select col_type_is('Permissions', 'createdAt', 'timestamp without time zone');

select has_column('Permissions', 'updatedAt');
select col_type_is('Permissions', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 