begin;
select plan(46);  -- 1 table test + (20 columns * 2 tests each) + 1 PK test

-- Test if the Roles table exists
select has_table('Roles');

-- Test if each column exists and has the correct type
select has_column('Roles', 'roleId');
select col_type_is('Roles', 'roleId', 'uuid');
select col_is_pk('Roles', 'roleId');

select has_column('Roles', 'accountId');
select col_type_is('Roles', 'accountId', 'uuid');

select has_column('Roles', 'name');
select col_type_is('Roles', 'name', 'character varying(255)');

select has_column('Roles', 'description');
select col_type_is('Roles', 'description', 'text');

select has_column('Roles', 'roleType');
select col_type_is('Roles', 'roleType', 'role_type');

select has_column('Roles', 'roleCategory');
select col_type_is('Roles', 'roleCategory', 'role_category');

select has_column('Roles', 'isEnterpriseOnly');
select col_type_is('Roles', 'isEnterpriseOnly', 'boolean');

select has_column('Roles', 'isStaffRole');
select col_type_is('Roles', 'isStaffRole', 'boolean');

select has_column('Roles', 'parentRoleId');
select col_type_is('Roles', 'parentRoleId', 'uuid');

select has_column('Roles', 'canViewAllTickets');
select col_type_is('Roles', 'canViewAllTickets', 'boolean');

select has_column('Roles', 'canManageAllTickets');
select col_type_is('Roles', 'canManageAllTickets', 'boolean');

select has_column('Roles', 'canConfigureSystem');
select col_type_is('Roles', 'canConfigureSystem', 'boolean');

select has_column('Roles', 'canManageUsers');
select col_type_is('Roles', 'canManageUsers', 'boolean');

select has_column('Roles', 'canManageRoles');
select col_type_is('Roles', 'canManageRoles', 'boolean');

select has_column('Roles', 'canViewReports');
select col_type_is('Roles', 'canViewReports', 'boolean');

select has_column('Roles', 'canManageGroups');
select col_type_is('Roles', 'canManageGroups', 'boolean');

select has_column('Roles', 'canManageOrganizations');
select col_type_is('Roles', 'canManageOrganizations', 'boolean');

select has_column('Roles', 'canMakePrivateComments');
select col_type_is('Roles', 'canMakePrivateComments', 'boolean');

select has_column('Roles', 'canMakePublicComments');
select col_type_is('Roles', 'canMakePublicComments', 'boolean');

select has_column('Roles', 'isDefault');
select col_type_is('Roles', 'isDefault', 'boolean');

select has_column('Roles', 'createdAt');
select col_type_is('Roles', 'createdAt', 'timestamp without time zone');

select has_column('Roles', 'updatedAt');
select col_type_is('Roles', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 