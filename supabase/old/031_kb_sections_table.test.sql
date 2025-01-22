begin;
select plan(22);  -- 1 table test + (10 columns * 2 tests each) + 1 PK test

-- Test if the KBSections table exists
select has_table('KBSections');

-- Test if each column exists and has the correct type
select has_column('KBSections', 'sectionId');
select col_type_is('KBSections', 'sectionId', 'uuid');
select col_is_pk('KBSections', 'sectionId');

select has_column('KBSections', 'categoryId');
select col_type_is('KBSections', 'categoryId', 'uuid');

select has_column('KBSections', 'parentSectionId');
select col_type_is('KBSections', 'parentSectionId', 'uuid');

select has_column('KBSections', 'accountId');
select col_type_is('KBSections', 'accountId', 'uuid');

select has_column('KBSections', 'name');
select col_type_is('KBSections', 'name', 'character varying(255)');

select has_column('KBSections', 'description');
select col_type_is('KBSections', 'description', 'text');

select has_column('KBSections', 'position');
select col_type_is('KBSections', 'position', 'integer');

select has_column('KBSections', 'isVisible');
select col_type_is('KBSections', 'isVisible', 'boolean');

select has_column('KBSections', 'createdAt');
select col_type_is('KBSections', 'createdAt', 'timestamp without time zone');

select has_column('KBSections', 'updatedAt');
select col_type_is('KBSections', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 