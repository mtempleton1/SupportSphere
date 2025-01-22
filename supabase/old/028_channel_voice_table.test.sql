begin;
select plan(18);  -- 1 table test + (8 columns * 2 tests each) + 1 PK test

-- Test if the ChannelVoice table exists
select has_table('ChannelVoice');

-- Test if each column exists and has the correct type
select has_column('ChannelVoice', 'channelId');
select col_type_is('ChannelVoice', 'channelId', 'uuid');
select col_is_pk('ChannelVoice', 'channelId');

select has_column('ChannelVoice', 'phoneNumber');
select col_type_is('ChannelVoice', 'phoneNumber', 'character varying(20)');

select has_column('ChannelVoice', 'greeting');
select col_type_is('ChannelVoice', 'greeting', 'text');

select has_column('ChannelVoice', 'voicemailGreeting');
select col_type_is('ChannelVoice', 'voicemailGreeting', 'text');

select has_column('ChannelVoice', 'recordCalls');
select col_type_is('ChannelVoice', 'recordCalls', 'boolean');

select has_column('ChannelVoice', 'transcribeVoicemail');
select col_type_is('ChannelVoice', 'transcribeVoicemail', 'boolean');

select has_column('ChannelVoice', 'createdAt');
select col_type_is('ChannelVoice', 'createdAt', 'timestamp without time zone');

select has_column('ChannelVoice', 'updatedAt');
select col_type_is('ChannelVoice', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 