begin;
select plan(16);  -- 1 table test + (7 columns * 2 tests each) + 1 PK test

-- Test if the ChannelInbox table exists
select has_table('ChannelInbox');

-- Test if each column exists and has the correct type
select has_column('ChannelInbox', 'channelId');
select col_type_is('ChannelInbox', 'channelId', 'uuid');
select col_is_pk('ChannelInbox', 'channelId');

select has_column('ChannelInbox', 'email');
select col_type_is('ChannelInbox', 'email', 'character varying(255)');

select has_column('ChannelInbox', 'forwardingAddress');
select col_type_is('ChannelInbox', 'forwardingAddress', 'character varying(255)');

select has_column('ChannelInbox', 'customDomain');
select col_type_is('ChannelInbox', 'customDomain', 'character varying(255)');

select has_column('ChannelInbox', 'signature');
select col_type_is('ChannelInbox', 'signature', 'text');

select has_column('ChannelInbox', 'createdAt');
select col_type_is('ChannelInbox', 'createdAt', 'timestamp without time zone');

select has_column('ChannelInbox', 'updatedAt');
select col_type_is('ChannelInbox', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 