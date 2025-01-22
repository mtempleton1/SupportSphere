begin;
select plan(8);  -- 1 table test + (3 columns * 2 tests each) + 1 composite PK test

-- Test if the KBArticleSubscriptions table exists
select has_table('KBArticleSubscriptions');

-- Test if each column exists and has the correct type
select has_column('KBArticleSubscriptions', 'articleId');
select col_type_is('KBArticleSubscriptions', 'articleId', 'uuid');

select has_column('KBArticleSubscriptions', 'userId');
select col_type_is('KBArticleSubscriptions', 'userId', 'uuid');

select has_column('KBArticleSubscriptions', 'createdAt');
select col_type_is('KBArticleSubscriptions', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('KBArticleSubscriptions', ARRAY['articleId', 'userId']);

select * from finish();
rollback; 