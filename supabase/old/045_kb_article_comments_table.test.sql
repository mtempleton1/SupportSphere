begin;
select plan(16);  -- 1 table test + (7 columns * 2 tests each) + 1 PK test

-- Test if the KBArticleComments table exists
select has_table('KBArticleComments');

-- Test if each column exists and has the correct type
select has_column('KBArticleComments', 'commentId');
select col_type_is('KBArticleComments', 'commentId', 'uuid');
select col_is_pk('KBArticleComments', 'commentId');

select has_column('KBArticleComments', 'articleId');
select col_type_is('KBArticleComments', 'articleId', 'uuid');

select has_column('KBArticleComments', 'authorId');
select col_type_is('KBArticleComments', 'authorId', 'uuid');

select has_column('KBArticleComments', 'content');
select col_type_is('KBArticleComments', 'content', 'text');

select has_column('KBArticleComments', 'isPublic');
select col_type_is('KBArticleComments', 'isPublic', 'boolean');

select has_column('KBArticleComments', 'createdAt');
select col_type_is('KBArticleComments', 'createdAt', 'timestamp without time zone');

select has_column('KBArticleComments', 'updatedAt');
select col_type_is('KBArticleComments', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 