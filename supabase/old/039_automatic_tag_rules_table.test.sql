begin;
select plan(20);  -- 1 table test + (9 columns * 2 tests each) + 1 PK test

-- Test if the AutomaticTagRules table exists
select has_table('AutomaticTagRules');

-- Test if each column exists and has the correct type
select has_column('AutomaticTagRules', 'ruleId');
select col_type_is('AutomaticTagRules', 'ruleId', 'uuid');
select col_is_pk('AutomaticTagRules', 'ruleId');

select has_column('AutomaticTagRules', 'accountId');
select col_type_is('AutomaticTagRules', 'accountId', 'uuid');

select has_column('AutomaticTagRules', 'name');
select col_type_is('AutomaticTagRules', 'name', 'character varying(255)');

select has_column('AutomaticTagRules', 'description');
select col_type_is('AutomaticTagRules', 'description', 'text');

select has_column('AutomaticTagRules', 'keyword');
select col_type_is('AutomaticTagRules', 'keyword', 'character varying(255)');

select has_column('AutomaticTagRules', 'tag');
select col_type_is('AutomaticTagRules', 'tag', 'character varying(100)');

select has_column('AutomaticTagRules', 'isActive');
select col_type_is('AutomaticTagRules', 'isActive', 'boolean');

select has_column('AutomaticTagRules', 'createdAt');
select col_type_is('AutomaticTagRules', 'createdAt', 'timestamp without time zone');

select has_column('AutomaticTagRules', 'updatedAt');
select col_type_is('AutomaticTagRules', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 