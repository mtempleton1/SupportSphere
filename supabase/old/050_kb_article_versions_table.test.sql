begin;
select plan(12);  -- 1 table test + (5 columns * 2 tests each) + 1 PK test

-- Test if the KBArticleVersions table exists
select has_table('KBArticleVersions');

-- Test if each column exists and has the correct type
select has_column('KBArticleVersions', 'versionId');
select col_type_is('KBArticleVersions', 'versionId', 'uuid');
select col_is_pk('KBArticleVersions', 'versionId');

select has_column('KBArticleVersions', 'articleId');
select col_type_is('KBArticleVersions', 'articleId', 'uuid');

select has_column('KBArticleVersions', 'title');
select col_type_is('KBArticleVersions', 'title', 'character varying(255)');

select has_column('KBArticleVersions', 'body');
select col_type_is('KBArticleVersions', 'body', 'text');

select has_column('KBArticleVersions', 'createdAt');
select col_type_is('KBArticleVersions', 'createdAt', 'timestamp without time zone');

select * from finish();
rollback; 