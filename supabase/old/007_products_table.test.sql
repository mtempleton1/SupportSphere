begin;
select plan(12);  -- 1 table test + (5 columns * 2 tests each) + 1 PK test

-- Test if the Products table exists
select has_table('Products');

-- Test if each column exists and has the correct type
select has_column('Products', 'productId');
select col_type_is('Products', 'productId', 'uuid');
select col_is_pk('Products', 'productId');

select has_column('Products', 'name');
select col_type_is('Products', 'name', 'character varying(255)');

select has_column('Products', 'description');
select col_type_is('Products', 'description', 'text');

select has_column('Products', 'createdAt');
select col_type_is('Products', 'createdAt', 'timestamp without time zone');

select has_column('Products', 'updatedAt');
select col_type_is('Products', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 