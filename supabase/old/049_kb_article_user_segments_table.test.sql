begin;
select plan(8);  -- 1 table test + (3 columns * 2 tests each) + 1 composite PK test

-- Test if the KBArticleUserSegments table exists
select has_table('KBArticleUserSegments');

-- Test if each column exists and has the correct type
select has_column('KBArticleUserSegments', 'articleId');
select col_type_is('KBArticleUserSegments', 'articleId', 'uuid');

select has_column('KBArticleUserSegments', 'segmentId');
select col_type_is('KBArticleUserSegments', 'segmentId', 'uuid');

select has_column('KBArticleUserSegments', 'createdAt');
select col_type_is('KBArticleUserSegments', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('KBArticleUserSegments', ARRAY['articleId', 'segmentId']);

select * from finish();
rollback; 