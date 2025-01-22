begin;
select plan(22);  -- 1 table test + (9 columns * 2 tests each) + 1 PK test

-- Test if the Channels table exists
select has_table('Channels');

-- Test if each column exists and has the correct type
select has_column('Channels', 'channelId');
select col_type_is('Channels', 'channelId', 'uuid');
select col_is_pk('Channels', 'channelId');

select has_column('Channels', 'accountId');
select col_type_is('Channels', 'accountId', 'uuid');

select has_column('Channels', 'brandId');
select col_type_is('Channels', 'brandId', 'uuid');

select has_column('Channels', 'type');
select col_type_is('Channels', 'type', 'channel_type');

select has_column('Channels', 'name');
select col_type_is('Channels', 'name', 'character varying(255)');

select has_column('Channels', 'description');
select col_type_is('Channels', 'description', 'text');

select has_column('Channels', 'isEnabled');
select col_type_is('Channels', 'isEnabled', 'boolean');

select has_column('Channels', 'configuration');
select col_type_is('Channels', 'configuration', 'jsonb');

select has_column('Channels', 'createdAt');
select col_type_is('Channels', 'createdAt', 'timestamp without time zone');

select has_column('Channels', 'updatedAt');
select col_type_is('Channels', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 