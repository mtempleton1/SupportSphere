begin;
select plan(24);  -- 1 table test + (11 columns * 2 tests each) + 1 PK test

-- Test if the Macros table exists
select has_table('Macros');

-- Test if each column exists and has the correct type
select has_column('Macros', 'macroId');
select col_type_is('Macros', 'macroId', 'uuid');
select col_is_pk('Macros', 'macroId');

select has_column('Macros', 'accountId');
select col_type_is('Macros', 'accountId', 'uuid');

select has_column('Macros', 'categoryId');
select col_type_is('Macros', 'categoryId', 'uuid');

select has_column('Macros', 'createdById');
select col_type_is('Macros', 'createdById', 'uuid');

select has_column('Macros', 'title');
select col_type_is('Macros', 'title', 'character varying(255)');

select has_column('Macros', 'description');
select col_type_is('Macros', 'description', 'text');

select has_column('Macros', 'isPersonal');
select col_type_is('Macros', 'isPersonal', 'boolean');

select has_column('Macros', 'isActive');
select col_type_is('Macros', 'isActive', 'boolean');

select has_column('Macros', 'position');
select col_type_is('Macros', 'position', 'integer');

select has_column('Macros', 'createdAt');
select col_type_is('Macros', 'createdAt', 'timestamp without time zone');

select has_column('Macros', 'updatedAt');
select col_type_is('Macros', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 