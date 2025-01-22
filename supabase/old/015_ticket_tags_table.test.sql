begin;
select plan(7);  -- 1 table test + (3 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the TicketTags table exists
select has_table('TicketTags');

-- Test if each column exists and has the correct type
select has_column('TicketTags', 'ticketId');
select col_type_is('TicketTags', 'ticketId', 'uuid');

select has_column('TicketTags', 'tag');
select col_type_is('TicketTags', 'tag', 'character varying(100)');

select has_column('TicketTags', 'createdAt');
select col_type_is('TicketTags', 'createdAt', 'timestamp without time zone');

select * from finish();
rollback; 