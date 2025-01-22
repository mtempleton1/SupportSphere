begin;
select plan(7);  -- 1 table test + (3 columns * 2 tests each) + 0 PK tests (composite PK)

-- Test if the PlanFeatures table exists
select has_table('PlanFeatures');

-- Test if each column exists and has the correct type
select has_column('PlanFeatures', 'planId');
select col_type_is('PlanFeatures', 'planId', 'uuid');

select has_column('PlanFeatures', 'featureId');
select col_type_is('PlanFeatures', 'featureId', 'uuid');

select has_column('PlanFeatures', 'accessLevel');
select col_type_is('PlanFeatures', 'accessLevel', 'character varying(512)');

select * from finish();
rollback; 