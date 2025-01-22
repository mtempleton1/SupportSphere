begin;
select plan(8);  -- 1 table test + (3 columns * 2 tests each) + 1 composite PK test

-- Test if the UserTags table exists
select has_table('UserTags');

-- Test if each column exists and has the correct type
select has_column('UserTags', 'userId');
select col_type_is('UserTags', 'userId', 'uuid');

select has_column('UserTags', 'tag');
select col_type_is('UserTags', 'tag', 'character varying(100)');

select has_column('UserTags', 'createdAt');
select col_type_is('UserTags', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('UserTags', ARRAY['userId', 'tag']);

select * from finish();
rollback; 