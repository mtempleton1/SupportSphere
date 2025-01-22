begin;
select plan(8);  -- 1 table test + (3 columns * 2 tests each) + 1 composite PK test

-- Test if the TicketAttachments table exists
select has_table('TicketAttachments');

-- Test if each column exists and has the correct type
select has_column('TicketAttachments', 'ticketId');
select col_type_is('TicketAttachments', 'ticketId', 'uuid');

select has_column('TicketAttachments', 'attachmentId');
select col_type_is('TicketAttachments', 'attachmentId', 'uuid');

select has_column('TicketAttachments', 'createdAt');
select col_type_is('TicketAttachments', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('TicketAttachments', ARRAY['ticketId', 'attachmentId']);

select * from finish();
rollback; 