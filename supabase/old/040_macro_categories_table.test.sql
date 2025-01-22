begin;
select plan(16);  -- 1 table test + (7 columns * 2 tests each) + 1 PK test

-- Test if the MacroCategories table exists
select has_table('MacroCategories');

-- Test if each column exists and has the correct type
select has_column('MacroCategories', 'categoryId');
select col_type_is('MacroCategories', 'categoryId', 'uuid');
select col_is_pk('MacroCategories', 'categoryId');

select has_column('MacroCategories', 'accountId');
select col_type_is('MacroCategories', 'accountId', 'uuid');

select has_column('MacroCategories', 'name');
select col_type_is('MacroCategories', 'name', 'character varying(255)');

select has_column('MacroCategories', 'description');
select col_type_is('MacroCategories', 'description', 'text');

select has_column('MacroCategories', 'parentCategoryId');
select col_type_is('MacroCategories', 'parentCategoryId', 'uuid');

select has_column('MacroCategories', 'createdAt');
select col_type_is('MacroCategories', 'createdAt', 'timestamp without time zone');

select has_column('MacroCategories', 'updatedAt');
select col_type_is('MacroCategories', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 