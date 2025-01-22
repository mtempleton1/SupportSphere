begin;
select plan(46);  -- 1 table test + (23 columns * 2 tests each) + 1 PK test

-- Test if the Tickets table exists
select has_table('Tickets');

-- Test if each column exists and has the correct type
select has_column('Tickets', 'ticketId');
select col_type_is('Tickets', 'ticketId', 'uuid');
select col_is_pk('Tickets', 'ticketId');

select has_column('Tickets', 'accountId');
select col_type_is('Tickets', 'accountId', 'uuid');

select has_column('Tickets', 'brandId');
select col_type_is('Tickets', 'brandId', 'uuid');

select has_column('Tickets', 'requesterId');
select col_type_is('Tickets', 'requesterId', 'uuid');

select has_column('Tickets', 'submitterId');
select col_type_is('Tickets', 'submitterId', 'uuid');

select has_column('Tickets', 'assigneeId');
select col_type_is('Tickets', 'assigneeId', 'uuid');

select has_column('Tickets', 'assigneeGroupId');
select col_type_is('Tickets', 'assigneeGroupId', 'uuid');

select has_column('Tickets', 'subject');
select col_type_is('Tickets', 'subject', 'character varying(150)');

select has_column('Tickets', 'description');
select col_type_is('Tickets', 'description', 'text');

select has_column('Tickets', 'status');
select col_type_is('Tickets', 'status', 'ticket_status');

select has_column('Tickets', 'type');
select col_type_is('Tickets', 'type', 'ticket_type');

select has_column('Tickets', 'priority');
select col_type_is('Tickets', 'priority', 'ticket_priority');

select has_column('Tickets', 'dueDate');
select col_type_is('Tickets', 'dueDate', 'timestamp without time zone');

select has_column('Tickets', 'isShared');
select col_type_is('Tickets', 'isShared', 'boolean');

select has_column('Tickets', 'isPublic');
select col_type_is('Tickets', 'isPublic', 'boolean');

select has_column('Tickets', 'problemTicketId');
select col_type_is('Tickets', 'problemTicketId', 'uuid');

select has_column('Tickets', 'createdAt');
select col_type_is('Tickets', 'createdAt', 'timestamp without time zone');

select has_column('Tickets', 'updatedAt');
select col_type_is('Tickets', 'updatedAt', 'timestamp without time zone');

select has_column('Tickets', 'solvedAt');
select col_type_is('Tickets', 'solvedAt', 'timestamp without time zone');

select has_column('Tickets', 'closedAt');
select col_type_is('Tickets', 'closedAt', 'timestamp without time zone');

select has_column('Tickets', 'ticketNumber');
select col_type_is('Tickets', 'ticketNumber', 'bigint');

select has_column('Tickets', 'channelId');
select col_type_is('Tickets', 'channelId', 'uuid');

select * from finish();
rollback; 