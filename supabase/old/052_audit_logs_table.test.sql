begin;
select plan(24);  -- 1 table test + (10 columns * 2 tests each) + 1 PK test

-- Test if the AuditLogs table exists
select has_table('AuditLogs');

-- Test if each column exists and has the correct type
select has_column('AuditLogs', 'auditId');
select col_type_is('AuditLogs', 'auditId', 'uuid');
select col_is_pk('AuditLogs', 'auditId');

select has_column('AuditLogs', 'accountId');
select col_type_is('AuditLogs', 'accountId', 'uuid');

select has_column('AuditLogs', 'entityType');
select col_type_is('AuditLogs', 'entityType', 'audit_entity_type');

select has_column('AuditLogs', 'entityId');
select col_type_is('AuditLogs', 'entityId', 'uuid');

select has_column('AuditLogs', 'action');
select col_type_is('AuditLogs', 'action', 'audit_action');

select has_column('AuditLogs', 'actorId');
select col_type_is('AuditLogs', 'actorId', 'uuid');

select has_column('AuditLogs', 'changes');
select col_type_is('AuditLogs', 'changes', 'jsonb');

select has_column('AuditLogs', 'metadata');
select col_type_is('AuditLogs', 'metadata', 'jsonb');

select has_column('AuditLogs', 'ipAddress');
select col_type_is('AuditLogs', 'ipAddress', 'inet');

select has_column('AuditLogs', 'userAgent');
select col_type_is('AuditLogs', 'userAgent', 'text');

select has_column('AuditLogs', 'performedAt');
select col_type_is('AuditLogs', 'performedAt', 'timestamp without time zone');

select * from finish();
rollback; 