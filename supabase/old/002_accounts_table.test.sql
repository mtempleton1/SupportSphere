begin;
select plan(20);  -- 1 table test + (9 columns * 2 tests each) + 1 PK test

-- Test if the Accounts table exists
select has_table('Accounts');

-- Test if each column exists and has the correct type
select has_column('Accounts', 'accountId');
select col_type_is('Accounts', 'accountId', 'uuid');
select col_is_pk('Accounts', 'accountId');

select has_column('Accounts', 'name');
select col_type_is('Accounts', 'name', 'character varying(255)');

select has_column('Accounts', 'subdomain');
select col_type_is('Accounts', 'subdomain', 'character varying(255)');

select has_column('Accounts', 'favicon');
select col_type_is('Accounts', 'favicon', 'character varying(255)');

select has_column('Accounts', 'planId');
select col_type_is('Accounts', 'planId', 'uuid');

select has_column('Accounts', 'endUserAccountCreationType');
select col_type_is('Accounts', 'endUserAccountCreationType', 'end_user_account_creation_type');

select has_column('Accounts', 'ownerId');
select col_type_is('Accounts', 'ownerId', 'uuid');

select has_column('Accounts', 'createdAt');
select col_type_is('Accounts', 'createdAt', 'timestamp without time zone');

select has_column('Accounts', 'updatedAt');
select col_type_is('Accounts', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 