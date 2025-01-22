begin;
select plan(5);  -- 1 table test + (2 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the RolePermissions table exists
select has_table('RolePermissions');

-- Test if each column exists and has the correct type
select has_column('RolePermissions', 'roleId');
select col_type_is('RolePermissions', 'roleId', 'uuid');

select has_column('RolePermissions', 'permissionId');
select col_type_is('RolePermissions', 'permissionId', 'uuid');

select * from finish();
rollback; 