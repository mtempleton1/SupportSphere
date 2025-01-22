begin;
select plan(28);  -- 1 table test + (12 columns * 2 tests each) + 1 PK test

-- Test if the CustomFields table exists
select has_table('CustomFields');

-- Test if each column exists and has the correct type
select has_column('CustomFields', 'fieldId');
select col_type_is('CustomFields', 'fieldId', 'uuid');
select col_is_pk('CustomFields', 'fieldId');

select has_column('CustomFields', 'accountId');
select col_type_is('CustomFields', 'accountId', 'uuid');

select has_column('CustomFields', 'name');
select col_type_is('CustomFields', 'name', 'character varying(255)');

select has_column('CustomFields', 'description');
select col_type_is('CustomFields', 'description', 'text');

select has_column('CustomFields', 'fieldType');
select col_type_is('CustomFields', 'fieldType', 'character varying(50)');

select has_column('CustomFields', 'isRequired');
select col_type_is('CustomFields', 'isRequired', 'boolean');

select has_column('CustomFields', 'isActive');
select col_type_is('CustomFields', 'isActive', 'boolean');

select has_column('CustomFields', 'defaultValue');
select col_type_is('CustomFields', 'defaultValue', 'text');

select has_column('CustomFields', 'options');
select col_type_is('CustomFields', 'options', 'jsonb');

select has_column('CustomFields', 'validationRules');
select col_type_is('CustomFields', 'validationRules', 'jsonb');

select has_column('CustomFields', 'position');
select col_type_is('CustomFields', 'position', 'integer');

select has_column('CustomFields', 'createdAt');
select col_type_is('CustomFields', 'createdAt', 'timestamp without time zone');

select has_column('CustomFields', 'updatedAt');
select col_type_is('CustomFields', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 