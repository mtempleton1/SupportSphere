begin;
select plan(26);  -- 1 table test + (11 columns * 2 tests each) + 1 PK test

-- Test if the Attachments table exists
select has_table('Attachments');

-- Test if each column exists and has the correct type
select has_column('Attachments', 'attachmentId');
select col_type_is('Attachments', 'attachmentId', 'uuid');
select col_is_pk('Attachments', 'attachmentId');

select has_column('Attachments', 'accountId');
select col_type_is('Attachments', 'accountId', 'uuid');

select has_column('Attachments', 'fileName');
select col_type_is('Attachments', 'fileName', 'character varying(255)');

select has_column('Attachments', 'fileSize');
select col_type_is('Attachments', 'fileSize', 'bigint');

select has_column('Attachments', 'mimeType');
select col_type_is('Attachments', 'mimeType', 'character varying(255)');

select has_column('Attachments', 'storageKey');
select col_type_is('Attachments', 'storageKey', 'text');

select has_column('Attachments', 'uploadedById');
select col_type_is('Attachments', 'uploadedById', 'uuid');

select has_column('Attachments', 'isPublic');
select col_type_is('Attachments', 'isPublic', 'boolean');

select has_column('Attachments', 'thumbnailStorageKey');
select col_type_is('Attachments', 'thumbnailStorageKey', 'text');

select has_column('Attachments', 'metadata');
select col_type_is('Attachments', 'metadata', 'jsonb');

select has_column('Attachments', 'createdAt');
select col_type_is('Attachments', 'createdAt', 'timestamp without time zone');

select has_column('Attachments', 'updatedAt');
select col_type_is('Attachments', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 