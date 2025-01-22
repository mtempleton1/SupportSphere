begin;
select plan(8);  -- 1 table test + (3 columns * 2 tests each) + 1 composite PK test

-- Test if the CommentAttachments table exists
select has_table('CommentAttachments');

-- Test if each column exists and has the correct type
select has_column('CommentAttachments', 'commentId');
select col_type_is('CommentAttachments', 'commentId', 'uuid');

select has_column('CommentAttachments', 'attachmentId');
select col_type_is('CommentAttachments', 'attachmentId', 'uuid');

select has_column('CommentAttachments', 'createdAt');
select col_type_is('CommentAttachments', 'createdAt', 'timestamp without time zone');

-- Test composite primary key
select col_is_pk('CommentAttachments', ARRAY['commentId', 'attachmentId']);

select * from finish();
rollback; 