begin;
select plan(18);  -- 1 table test + (8 columns * 2 tests each) + 1 PK test

-- Test if the MacroActions table exists
select has_table('MacroActions');

-- Test if each column exists and has the correct type
select has_column('MacroActions', 'actionId');
select col_type_is('MacroActions', 'actionId', 'uuid');
select col_is_pk('MacroActions', 'actionId');

select has_column('MacroActions', 'macroId');
select col_type_is('MacroActions', 'macroId', 'uuid');

select has_column('MacroActions', 'actionType');
select col_type_is('MacroActions', 'actionType', 'character varying(50)');

select has_column('MacroActions', 'field');
select col_type_is('MacroActions', 'field', 'character varying(100)');

select has_column('MacroActions', 'value');
select col_type_is('MacroActions', 'value', 'text');

select has_column('MacroActions', 'position');
select col_type_is('MacroActions', 'position', 'integer');

select has_column('MacroActions', 'createdAt');
select col_type_is('MacroActions', 'createdAt', 'timestamp without time zone');

select has_column('MacroActions', 'updatedAt');
select col_type_is('MacroActions', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 