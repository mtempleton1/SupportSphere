begin;
select plan(8);  -- 1 table test + (3 columns * 2 tests each) + 1 composite PK test

-- Test if the KBArticleTags table exists
select has_table('KBArticleTags');

-- Test if each column exists and has the correct type
select has_column('KBArticleTags', 'articleId');
select col_type_is('KBArticleTags', 'articleId', 'uuid');

select has_column('KBArticleTags', 'tag');
select col_type_is('KBArticleTags', 'tag', 'character varying(100)');

select has_column('KBArticleTags', 'createdAt');
select col_type_is('KBArticleTags', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('KBArticleTags', ARRAY['articleId', 'tag']);

select * from finish();
rollback; 