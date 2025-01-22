begin;
select plan(30);  -- 1 table test + (14 columns * 2 tests each) + 1 PK test

-- Test if the Brands table exists
select has_table('Brands');

-- Test if each column exists and has the correct type
select has_column('Brands', 'brandId');
select col_type_is('Brands', 'brandId', 'uuid');
select col_is_pk('Brands', 'brandId');

select has_column('Brands', 'accountId');
select col_type_is('Brands', 'accountId', 'uuid');

select has_column('Brands', 'name');
select col_type_is('Brands', 'name', 'character varying(255)');

select has_column('Brands', 'description');
select col_type_is('Brands', 'description', 'text');

select has_column('Brands', 'subdomain');
select col_type_is('Brands', 'subdomain', 'character varying(255)');

select has_column('Brands', 'logo');
select col_type_is('Brands', 'logo', 'character varying(255)');

select has_column('Brands', 'hostMapping');
select col_type_is('Brands', 'hostMapping', 'character varying(255)');

select has_column('Brands', 'brandSignature');
select col_type_is('Brands', 'brandSignature', 'text');

select has_column('Brands', 'isDefault');
select col_type_is('Brands', 'isDefault', 'boolean');

select has_column('Brands', 'isAgentBrand');
select col_type_is('Brands', 'isAgentBrand', 'boolean');

select has_column('Brands', 'isActive');
select col_type_is('Brands', 'isActive', 'boolean');

select has_column('Brands', 'sslCertificate');
select col_type_is('Brands', 'sslCertificate', 'text');

select has_column('Brands', 'createdAt');
select col_type_is('Brands', 'createdAt', 'timestamp without time zone');

select has_column('Brands', 'updatedAt');
select col_type_is('Brands', 'updatedAt', 'timestamp without time zone');

select * from finish();
rollback; 