--
-- Test file for Accounts table policies
-- Testing access control for different user types:
-- 1. Anonymous users
-- 2. Authenticated non-admin users
-- 3. Staff admins
-- 4. Account owners
--

-- Load the pgtap extension
-- CREATE EXTENSION IF NOT EXISTS pgtap;

begin;
select plan(4);



-- Test 2: Verify policies exist
-- select policies_are(
--     'public',
--     'Accounts',
--     ARRAY[
--         'Anyone can read basic account info',
--         'Staff admins can read all account fields',
--         'Account owners can update their account'
--     ],
--     'Accounts table should have exactly three policies'
-- );

-- Test 3: Anonymous access to public fields
set role anon;
select lives_ok(
    $$select name, subdomain, favicon, "endUserAccountCreationType" from "Accounts" limit 1$$,
    'Anonymous users should be able to read public fields'
);

-- Test 4: Anonymous access to private fields blocked
select throws_ok(
    $$select "planId", "createdAt", "updatedAt" from "Accounts" limit 1$$,
    42501,
    NULL,
    'Anonymous users should not be able to read private fields'
);

-- Test 5: Anonymous update blocked
select throws_ok(
    $$update "Accounts" set "name" = 'Updated Name' where true$$,
    42501,
    NULL,
    'Anonymous users should not be able to update accounts'
);

-- Test 6: Anonymous insert blocked
select throws_ok(
    $$insert into "Accounts" ("name", "subdomain", "planId") 
      values ('New Account', 'new', (select "planId" from "Plans" limit 1))$$,
    42501,
    NULL,
    'No one should be able to create accounts'
);

select * from finish();
rollback; 