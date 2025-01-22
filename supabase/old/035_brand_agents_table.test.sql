begin;
select plan(8);  -- 1 table test + (3 columns * 2 tests each) + 1 composite PK test

-- Test if the BrandAgents table exists
select has_table('BrandAgents');

-- Test if each column exists and has the correct type
select has_column('BrandAgents', 'brandId');
select col_type_is('BrandAgents', 'brandId', 'uuid');

select has_column('BrandAgents', 'userId');
select col_type_is('BrandAgents', 'userId', 'uuid');

select has_column('BrandAgents', 'createdAt');
select col_type_is('BrandAgents', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('BrandAgents', ARRAY['brandId', 'userId']);

select * from finish();
rollback; 