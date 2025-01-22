begin;
select plan(38);  -- 1 table test + (16 columns * 2 tests each) + 1 PK test

-- Test if the KBArticles table exists
select has_table('KBArticles');

-- Test if each column exists and has the correct type
select has_column('KBArticles', 'articleId');
select col_type_is('KBArticles', 'articleId', 'uuid');
select col_is_pk('KBArticles', 'articleId');

select has_column('KBArticles', 'accountId');
select col_type_is('KBArticles', 'accountId', 'uuid');

select has_column('KBArticles', 'title');
select col_type_is('KBArticles', 'title', 'character varying(255)');

select has_column('KBArticles', 'body');
select col_type_is('KBArticles', 'body', 'text');

select has_column('KBArticles', 'authorId');
select col_type_is('KBArticles', 'authorId', 'uuid');

select has_column('KBArticles', 'state');
select col_type_is('KBArticles', 'state', 'article_state');

select has_column('KBArticles', 'locale');
select col_type_is('KBArticles', 'locale', 'content_locale');

select has_column('KBArticles', 'sourceArticleId');
select col_type_is('KBArticles', 'sourceArticleId', 'uuid');

select has_column('KBArticles', 'position');
select col_type_is('KBArticles', 'position', 'integer');

select has_column('KBArticles', 'viewCount');
select col_type_is('KBArticles', 'viewCount', 'integer');

select has_column('KBArticles', 'voteUpCount');
select col_type_is('KBArticles', 'voteUpCount', 'integer');

select has_column('KBArticles', 'voteDownCount');
select col_type_is('KBArticles', 'voteDownCount', 'integer');

select has_column('KBArticles', 'isCommentsEnabled');
select col_type_is('KBArticles', 'isCommentsEnabled', 'boolean');

select has_column('KBArticles', 'isSubscriptionsEnabled');
select col_type_is('KBArticles', 'isSubscriptionsEnabled', 'boolean');

select has_column('KBArticles', 'createdAt');
select col_type_is('KBArticles', 'createdAt', 'timestamp without time zone');

select has_column('KBArticles', 'updatedAt');
select col_type_is('KBArticles', 'updatedAt', 'timestamp without time zone');

select has_column('KBArticles', 'publishedAt');
select col_type_is('KBArticles', 'publishedAt', 'timestamp without time zone');

select has_column('KBArticles', 'archivedAt');
select col_type_is('KBArticles', 'archivedAt', 'timestamp without time zone');

select * from finish();
rollback; 