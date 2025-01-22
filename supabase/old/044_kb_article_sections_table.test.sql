begin;
select plan(10);  -- 1 table test + (4 columns * 2 tests each) + 1 composite PK test

-- Test if the KBArticleSections table exists
select has_table('KBArticleSections');

-- Test if each column exists and has the correct type
select has_column('KBArticleSections', 'articleId');
select col_type_is('KBArticleSections', 'articleId', 'uuid');

select has_column('KBArticleSections', 'sectionId');
select col_type_is('KBArticleSections', 'sectionId', 'uuid');

select has_column('KBArticleSections', 'position');
select col_type_is('KBArticleSections', 'position', 'integer');

select has_column('KBArticleSections', 'createdAt');
select col_type_is('KBArticleSections', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('KBArticleSections', ARRAY['articleId', 'sectionId']);

select * from finish();
rollback; 