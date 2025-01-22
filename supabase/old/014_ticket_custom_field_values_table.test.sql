begin;
select plan(11);  -- 1 table test + (5 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the TicketCustomFieldValues table exists
select has_table('TicketCustomFieldValues');

-- Test if each column exists and has the correct type
select has_column('TicketCustomFieldValues', 'ticketId');
select col_type_is('TicketCustomFieldValues', 'ticketId', 'uuid');

select has_column('TicketCustomFieldValues', 'fieldId');
select col_type_is('TicketCustomFieldValues', 'fieldId', 'uuid');

select has_column('TicketCustomFieldValues', 'value');
select col_type_is('TicketCustomFieldValues', 'value', 'jsonb');

select has_column('TicketCustomFieldValues', 'createdAt');
select col_type_is('TicketCustomFieldValues', 'createdAt', 'timestamp without time zone');

select has_column('TicketCustomFieldValues', 'updatedAt');
select col_type_is('TicketCustomFieldValues', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 