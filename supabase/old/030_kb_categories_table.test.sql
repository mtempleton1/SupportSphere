begin;
select plan(18);  -- 1 table test + (8 columns * 2 tests each) + 1 PK test

-- Test if the KBCategories table exists
select has_table('KBCategories');

-- Test if each column exists and has the correct type
select has_column('KBCategories', 'categoryId');
select col_type_is('KBCategories', 'categoryId', 'uuid');
select col_is_pk('KBCategories', 'categoryId');

select has_column('KBCategories', 'accountId');
select col_type_is('KBCategories', 'accountId', 'uuid');

select has_column('KBCategories', 'name');
select col_type_is('KBCategories', 'name', 'character varying(255)');

select has_column('KBCategories', 'description');
select col_type_is('KBCategories', 'description', 'text');

select has_column('KBCategories', 'position');
select col_type_is('KBCategories', 'position', 'integer');

select has_column('KBCategories', 'isVisible');
select col_type_is('KBCategories', 'isVisible', 'boolean');

select has_column('KBCategories', 'createdAt');
select col_type_is('KBCategories', 'createdAt', 'timestamp without time zone');

select has_column('KBCategories', 'updatedAt');
select col_type_is('KBCategories', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 