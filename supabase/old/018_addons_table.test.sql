begin;
select plan(14);  -- 1 table test + (5 columns * 2 tests each) + 1 PK test

-- Test if the AddOns table exists
select has_table('AddOns');

-- Test if each column exists and has the correct type
select has_column('AddOns', 'addOnId');
select col_type_is('AddOns', 'addOnId', 'uuid');
select col_is_pk('AddOns', 'addOnId');

select has_column('AddOns', 'name');
select col_type_is('AddOns', 'name', 'character varying(255)');

select has_column('AddOns', 'description');
select col_type_is('AddOns', 'description', 'text');

select has_column('AddOns', 'pricingModel');
select col_type_is('AddOns', 'pricingModel', 'character varying(255)');

select has_column('AddOns', 'createdAt');
select col_type_is('AddOns', 'createdAt', 'timestamp without time zone');

select has_column('AddOns', 'updatedAt');
select col_type_is('AddOns', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 