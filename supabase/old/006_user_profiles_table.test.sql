begin;
select plan(26);  -- 1 table test + (11 columns * 2 tests each) + 1 PK test

-- Test if the UserProfiles table exists
select has_table('UserProfiles');

-- Test if each column exists and has the correct type
select has_column('UserProfiles', 'userId');
select col_type_is('UserProfiles', 'userId', 'uuid');
select col_is_pk('UserProfiles', 'userId');

select has_column('UserProfiles', 'name');
select col_type_is('UserProfiles', 'name', 'character varying(255)');

select has_column('UserProfiles', 'userType');
select col_type_is('UserProfiles', 'userType', 'character varying(50)');

select has_column('UserProfiles', 'roleId');
select col_type_is('UserProfiles', 'roleId', 'uuid');

select has_column('UserProfiles', 'accountId');
select col_type_is('UserProfiles', 'accountId', 'uuid');

select has_column('UserProfiles', 'organizationId');
select col_type_is('UserProfiles', 'organizationId', 'uuid');

select has_column('UserProfiles', 'isActive');
select col_type_is('UserProfiles', 'isActive', 'boolean');

select has_column('UserProfiles', 'isSuspended');
select col_type_is('UserProfiles', 'isSuspended', 'boolean');

select has_column('UserProfiles', 'isEmailVerified');
select col_type_is('UserProfiles', 'isEmailVerified', 'boolean');

select has_column('UserProfiles', 'lastLoginAt');
select col_type_is('UserProfiles', 'lastLoginAt', 'timestamp without time zone');

select has_column('UserProfiles', 'createdAt');
select col_type_is('UserProfiles', 'createdAt', 'timestamp without time zone');

select has_column('UserProfiles', 'updatedAt');
select col_type_is('UserProfiles', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 