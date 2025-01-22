begin;
select plan(7);  -- 1 table test + (3 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the TicketCCs table exists
select has_table('TicketCCs');

-- Test if each column exists and has the correct type
select has_column('TicketCCs', 'ticketId');
select col_type_is('TicketCCs', 'ticketId', 'uuid');

select has_column('TicketCCs', 'userId');
select col_type_is('TicketCCs', 'userId', 'uuid');

select has_column('TicketCCs', 'createdAt');
select col_type_is('TicketCCs', 'createdAt', 'timestamp without time zone');

select * from finish();
rollback; 