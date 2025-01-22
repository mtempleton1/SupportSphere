-- begin;
-- select plan(4);

-- -- Test 1: Verify RLS is enabled by checking that public access is restricted by default
-- set role anon;
-- select throws_ok(
--     $$insert into "AddOns" ("name", "description", "pricingModel") 
--       values ('Test Add-on', 'Description', 'per_user')$$,
--     42501,
--     NULL,
--     'RLS should be enabled and blocking inserts by default'
-- );

-- -- Test 2: Anonymous read access
-- select lives_ok(
--     $$select * from "AddOns" limit 1$$,
--     'Anonymous users should be able to read from AddOns'
-- );

-- -- Test 3: Anonymous update silently fails
-- DO $$
-- DECLARE
--     _addon_name text;
--     _addon_id uuid;
-- BEGIN
--     -- Get an add-on to test with
--     SELECT "addOnId", "name" INTO _addon_id, _addon_name FROM "AddOns" LIMIT 1;
    
--     -- Attempt to update
--     UPDATE "AddOns" SET "name" = 'Updated Name' WHERE "addOnId" = _addon_id;
    
--     -- Verify name hasn't changed
--     ASSERT (
--         SELECT "name" = _addon_name 
--         FROM "AddOns" 
--         WHERE "addOnId" = _addon_id
--     ), 'Add-on name should not have changed after update attempt';
-- END $$;

-- select ok(true, 'Anonymous update attempt should silently fail');

-- -- Test 4: Anonymous delete silently fails
-- DO $$
-- DECLARE
--     _addon_count integer;
--     _addon_id uuid;
-- BEGIN
--     -- Count add-ons and get one to test with
--     SELECT COUNT(*) INTO _addon_count FROM "AddOns";
--     SELECT "addOnId" INTO _addon_id FROM "AddOns" LIMIT 1;
    
--     -- Attempt to delete
--     DELETE FROM "AddOns" WHERE "addOnId" = _addon_id;
    
--     -- Verify count hasn't changed and add-on still exists
--     ASSERT (
--         SELECT COUNT(*) = _addon_count FROM "AddOns"
--     ), 'Add-on count should not have changed after delete attempt';
    
--     ASSERT (
--         SELECT EXISTS(SELECT 1 FROM "AddOns" WHERE "addOnId" = _addon_id)
--     ), 'Add-on should still exist after delete attempt';
-- END $$;

-- select ok(true, 'Anonymous delete attempt should silently fail');

-- select * from finish();
-- rollback; 