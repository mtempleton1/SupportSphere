begin;
select plan(14);  -- 1 table test + (6 columns * 2 tests each) + 1 PK test

-- Test if the Features table exists
select has_table('Features');

-- Test if each column exists and has the correct type
select has_column('Features', 'featureId');
select col_type_is('Features', 'featureId', 'uuid');
select col_is_pk('Features', 'featureId');

select has_column('Features', 'name');
select col_type_is('Features', 'name', 'character varying(255)');

select has_column('Features', 'description');
select col_type_is('Features', 'description', 'text');

select has_column('Features', 'isAddOn');
select col_type_is('Features', 'isAddOn', 'boolean');

select has_column('Features', 'createdAt');
select col_type_is('Features', 'createdAt', 'timestamp without time zone');

select has_column('Features', 'updatedAt');
select col_type_is('Features', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 