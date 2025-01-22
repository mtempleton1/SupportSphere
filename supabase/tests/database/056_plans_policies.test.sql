--
-- Test file for Plans table policies
-- Testing access control for different user types:
-- 1. Anonymous users
-- 2. Authenticated users
--

-- Load the pgtap extension
-- CREATE EXTENSION IF NOT EXISTS pgtap;

begin;
select plan(4);

-- Test 1: Verify RLS is enabled by checking that public access is restricted by default
set role anon;
select throws_ok(
    $$insert into "Plans" ("name", "monthlySubscriptionPerAgent", "annualSubscriptionPerAgent", "type") 
      values ('Test Plan 2', 10, 100, 'suite')$$,
    42501,
    NULL,
    'RLS should be enabled and blocking inserts by default'
);

-- Test 2: Anonymous read access
select lives_ok(
    $$select * from "Plans" limit 1$$,
    'Anonymous users should be able to read from Plans'
);

-- Test 3: Anonymous update silently fails
DO $$
DECLARE
    _plan_name text;
    _plan_id uuid;
BEGIN
    -- Get a plan to test with
    SELECT "planId", "name" INTO _plan_id, _plan_name FROM "Plans" LIMIT 1;
    
    -- Attempt to update
    UPDATE "Plans" SET "name" = 'Updated Name' WHERE "planId" = _plan_id;
    
    -- Verify name hasn't changed
    ASSERT (
        SELECT "name" = _plan_name 
        FROM "Plans" 
        WHERE "planId" = _plan_id
    ), 'Plan name should not have changed after update attempt';
END $$;

select ok(true, 'Anonymous update attempt should silently fail');

-- Test 4: Anonymous delete silently fails
DO $$
DECLARE
    _plan_count integer;
    _plan_id uuid;
BEGIN
    -- Count plans and get one to test with
    SELECT COUNT(*) INTO _plan_count FROM "Plans";
    SELECT "planId" INTO _plan_id FROM "Plans" LIMIT 1;
    
    -- Attempt to delete
    DELETE FROM "Plans" WHERE "planId" = _plan_id;
    
    -- Verify count hasn't changed and plan still exists
    ASSERT (
        SELECT COUNT(*) = _plan_count FROM "Plans"
    ), 'Plan count should not have changed after delete attempt';
    
    ASSERT (
        SELECT EXISTS(SELECT 1 FROM "Plans" WHERE "planId" = _plan_id)
    ), 'Plan should still exist after delete attempt';
END $$;

select ok(true, 'Anonymous delete attempt should silently fail');

select * from finish();
rollback; 