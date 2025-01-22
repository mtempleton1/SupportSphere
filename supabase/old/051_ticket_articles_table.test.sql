begin;
select plan(12);  -- 1 table test + (5 columns * 2 tests each) + 1 composite PK test

-- Test if the TicketArticles table exists
select has_table('TicketArticles');

-- Test if each column exists and has the correct type
select has_column('TicketArticles', 'ticketId');
select col_type_is('TicketArticles', 'ticketId', 'uuid');

select has_column('TicketArticles', 'articleId');
select col_type_is('TicketArticles', 'articleId', 'uuid');

select has_column('TicketArticles', 'linkType');
select col_type_is('TicketArticles', 'linkType', 'character varying(50)');

select has_column('TicketArticles', 'createdAt');
select col_type_is('TicketArticles', 'createdAt', 'timestamp without time zone');

select has_column('TicketArticles', 'createdById');
select col_type_is('TicketArticles', 'createdById', 'uuid');

-- Test composite primary key
select col_is_pk('TicketArticles', ARRAY['ticketId', 'articleId']);

select * from finish();
rollback; 