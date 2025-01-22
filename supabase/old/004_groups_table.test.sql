begin;
select plan(18);  -- 1 table test + (8 columns * 2 tests each) + 1 PK test

-- Test if the Groups table exists
select has_table('Groups');

-- Test if each column exists and has the correct type
select has_column('Groups', 'groupId');
select col_type_is('Groups', 'groupId', 'uuid');
select col_is_pk('Groups', 'groupId');

select has_column('Groups', 'accountId');
select col_type_is('Groups', 'accountId', 'uuid');

select has_column('Groups', 'name');
select col_type_is('Groups', 'name', 'character varying(255)');

select has_column('Groups', 'description');
select col_type_is('Groups', 'description', 'text');

select has_column('Groups', 'isPrivate');
select col_type_is('Groups', 'isPrivate', 'boolean');

select has_column('Groups', 'solvedTicketReassignmentStrategy');
select col_type_is('Groups', 'solvedTicketReassignmentStrategy', 'character varying(50)');

select has_column('Groups', 'createdAt');
select col_type_is('Groups', 'createdAt', 'timestamp without time zone');

select has_column('Groups', 'updatedAt');
select col_type_is('Groups', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 