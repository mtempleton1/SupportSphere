begin;
select plan(10);  -- 1 table test + (4 columns * 2 tests each) + 1 composite PK test

-- Test if the KBArticleAttachments table exists
select has_table('KBArticleAttachments');

-- Test if each column exists and has the correct type
select has_column('KBArticleAttachments', 'attachmentId');
select col_type_is('KBArticleAttachments', 'attachmentId', 'uuid');

select has_column('KBArticleAttachments', 'articleId');
select col_type_is('KBArticleAttachments', 'articleId', 'uuid');

select has_column('KBArticleAttachments', 'position');
select col_type_is('KBArticleAttachments', 'position', 'integer');

select has_column('KBArticleAttachments', 'createdAt');
select col_type_is('KBArticleAttachments', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('KBArticleAttachments', ARRAY['attachmentId', 'articleId']);

select * from finish();
rollback; 