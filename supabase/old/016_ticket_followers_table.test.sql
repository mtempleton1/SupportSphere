begin;
select plan(7);  -- 1 table test + (3 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the TicketFollowers table exists
select has_table('TicketFollowers');

-- Test if each column exists and has the correct type
select has_column('TicketFollowers', 'ticketId');
select col_type_is('TicketFollowers', 'ticketId', 'uuid');

select has_column('TicketFollowers', 'userId');
select col_type_is('TicketFollowers', 'userId', 'uuid');

select has_column('TicketFollowers', 'createdAt');
select col_type_is('TicketFollowers', 'createdAt', 'timestamp without time zone');

select * from finish();
rollback; 