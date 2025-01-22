begin;
select plan(18);  -- We'll make 18 assertions

-- Test if the Plans table exists
select has_table('Plans');

-- Test if each column exists and has the correct type
select has_column('Plans', 'planId');
select col_type_is('Plans', 'planId', 'uuid');
select col_is_pk('Plans', 'planId');

select has_column('Plans', 'name');
select col_type_is('Plans', 'name', 'character varying(255)');

select has_column('Plans', 'description');
select col_type_is('Plans', 'description', 'text');

select has_column('Plans', 'type');
select col_type_is('Plans', 'type', 'character varying(50)');

select has_column('Plans', 'monthlySubscriptionPerAgent');
select col_type_is('Plans', 'monthlySubscriptionPerAgent', 'numeric(10,2)');

select has_column('Plans', 'annualSubscriptionPerAgent');
select col_type_is('Plans', 'annualSubscriptionPerAgent', 'numeric(10,2)');

select has_column('Plans', 'createdAt');
select col_type_is('Plans', 'createdAt', 'timestamp without time zone');

select has_column('Plans', 'updatedAt');
select col_type_is('Plans', 'updatedAt', 'timestamp without time zone');

-- Add more column checks as needed...

select * from finish();
rollback; 