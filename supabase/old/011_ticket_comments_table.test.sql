begin;
select plan(16);  -- 1 table test + (7 columns * 2 tests each) + 1 PK test

-- Test if the TicketComments table exists
select has_table('TicketComments');

-- Test if each column exists and has the correct type
select has_column('TicketComments', 'commentId');
select col_type_is('TicketComments', 'commentId', 'uuid');
select col_is_pk('TicketComments', 'commentId');

select has_column('TicketComments', 'ticketId');
select col_type_is('TicketComments', 'ticketId', 'uuid');

select has_column('TicketComments', 'authorId');
select col_type_is('TicketComments', 'authorId', 'uuid');

select has_column('TicketComments', 'content');
select col_type_is('TicketComments', 'content', 'text');

select has_column('TicketComments', 'isPublic');
select col_type_is('TicketComments', 'isPublic', 'boolean');

select has_column('TicketComments', 'createdAt');
select col_type_is('TicketComments', 'createdAt', 'timestamp without time zone');

select has_column('TicketComments', 'updatedAt');
select col_type_is('TicketComments', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 