begin;
select plan(12);  -- 1 table test + (5 columns * 2 tests each) + 1 composite PK test

-- Test if the MacroUsageStats table exists
select has_table('MacroUsageStats');

-- Test if each column exists and has the correct type
select has_column('MacroUsageStats', 'macroId');
select col_type_is('MacroUsageStats', 'macroId', 'uuid');

select has_column('MacroUsageStats', 'userId');
select col_type_is('MacroUsageStats', 'userId', 'uuid');

select has_column('MacroUsageStats', 'usageCount');
select col_type_is('MacroUsageStats', 'usageCount', 'integer');

select has_column('MacroUsageStats', 'lastUsedAt');
select col_type_is('MacroUsageStats', 'lastUsedAt', 'timestamp without time zone');

select has_column('MacroUsageStats', 'weekStartDate');
select col_type_is('MacroUsageStats', 'weekStartDate', 'date');

-- Test composite primary key
select col_is_pk('MacroUsageStats', ARRAY['macroId', 'userId', 'weekStartDate']);

select * from finish();
rollback; 