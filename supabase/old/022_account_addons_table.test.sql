begin;
select plan(7);  -- 1 table test + (3 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the AccountAddOns table exists
select has_table('AccountAddOns');

-- Test if each column exists and has the correct type
select has_column('AccountAddOns', 'accountId');
select col_type_is('AccountAddOns', 'accountId', 'uuid');

select has_column('AccountAddOns', 'addOnId');
select col_type_is('AccountAddOns', 'addOnId', 'uuid');

select has_column('AccountAddOns', 'createdAt');
select col_type_is('AccountAddOns', 'createdAt', 'timestamp without time zone');

select * from finish();
rollback; 