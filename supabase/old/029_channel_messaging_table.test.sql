begin;
select plan(16);  -- 1 table test + (7 columns * 2 tests each) + 1 PK test

-- Test if the ChannelMessaging table exists
select has_table('ChannelMessaging');

-- Test if each column exists and has the correct type
select has_column('ChannelMessaging', 'channelId');
select col_type_is('ChannelMessaging', 'channelId', 'uuid');
select col_is_pk('ChannelMessaging', 'channelId');

select has_column('ChannelMessaging', 'providerAccountId');
select col_type_is('ChannelMessaging', 'providerAccountId', 'character varying(255)');

select has_column('ChannelMessaging', 'providerPhoneNumber');
select col_type_is('ChannelMessaging', 'providerPhoneNumber', 'character varying(20)');

select has_column('ChannelMessaging', 'providerUsername');
select col_type_is('ChannelMessaging', 'providerUsername', 'character varying(255)');

select has_column('ChannelMessaging', 'webhookUrl');
select col_type_is('ChannelMessaging', 'webhookUrl', 'text');

select has_column('ChannelMessaging', 'createdAt');
select col_type_is('ChannelMessaging', 'createdAt', 'timestamp without time zone');

select has_column('ChannelMessaging', 'updatedAt');
select col_type_is('ChannelMessaging', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 