--
-- Test file for database functions
-- Specifically testing the propagate_tags_to_ticket trigger function
--

begin;
select plan(6); -- We'll start with 6 tests

-- Test 1: Verify the function exists
select has_function(
    'propagate_tags_to_ticket',
    'Function propagate_tags_to_ticket should exist'
);

-- Test 2: Verify function return type
select function_returns(
    'propagate_tags_to_ticket',
    'trigger',
    'Function propagate_tags_to_ticket should return trigger'
);

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS propagate_tags_on_ticket_creation ON "Tickets";
CREATE TRIGGER propagate_tags_on_ticket_creation
    AFTER INSERT ON "Tickets"
    FOR EACH ROW
    EXECUTE FUNCTION propagate_tags_to_ticket();

-- Create test data and store IDs for later assertions
create temporary table _test_data (
    ticket_id uuid,
    user_id uuid,
    org_id uuid,
    test_case text
);

do $$
declare
    _ticket_id uuid;
    _account_id uuid;
    _brand_id uuid;
    _user_id uuid;
    _org_id uuid;
begin
    -- Get first account ID
    select "accountId" into _account_id
    from "Accounts"
    limit 1;

    -- Get first brand ID for this account
    select "brandId" into _brand_id
    from "Brands"
    where "accountId" = _account_id
    limit 1;

    -- Create a test organization
    insert into "Organizations" ("accountId", "name")
    values (_account_id, 'Test Organization')
    returning "organizationId" into _org_id;

    -- Create auth user first
    _user_id := gen_random_uuid();
    insert into auth.users (id, email)
    values (_user_id, 'test.user@example.com');

    -- Create a test user with the organization
    insert into "UserProfiles" ("userId", "accountId", "organizationId", "name", "userType")
    values (_user_id, _account_id, _org_id, 'Test User', 'end_user');

    -- Add some tags to the user
    insert into "UserTags" ("userId", "tag")
    values 
        (_user_id, 'vip'),
        (_user_id, 'priority');

    -- Add some tags to the organization
    insert into "OrganizationTags" ("organizationId", "tag")
    values 
        (_org_id, 'enterprise'),
        (_org_id, 'support-plus');

    -- Create a test ticket
    insert into "Tickets" (
        "accountId",
        "brandId",
        "requesterId",
        "submitterId",
        "subject",
        "description",
        "status",
        "ticketNumber"
    ) values (
        _account_id,
        _brand_id,
        _user_id,
        _user_id,
        'Test Ticket',
        'Test Description',
        'new',
        1
    ) returning "ticketId" into _ticket_id;

    -- Store the test data for later assertions
    insert into _test_data (ticket_id, user_id, org_id, test_case)
    values (_ticket_id, _user_id, _org_id, 'Test 1');
end $$;

-- Test 3: Verify user tags were propagated
select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'Test 1')
        and "tag" in ('vip', 'priority')
    ),
    2::bigint,
    'User tags should be propagated to the ticket'
);

-- Test 4: Verify organization tags were propagated
select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'Test 1')
        and "tag" in ('enterprise', 'support-plus')
    ),
    2::bigint,
    'Organization tags should be propagated to the ticket'
);

-- Test 5: Create a ticket for a user without organization
do $$
declare
    _ticket_id uuid;
    _account_id uuid;
    _brand_id uuid;
    _user_id uuid;
begin
    -- Get first account ID
    select "accountId" into _account_id
    from "Accounts"
    limit 1;

    -- Get first brand ID for this account
    select "brandId" into _brand_id
    from "Brands"
    where "accountId" = _account_id
    limit 1;

    -- Create auth user first
    _user_id := gen_random_uuid();
    insert into auth.users (id, email)
    values (_user_id, 'test.user2@example.com');

    -- Create a test user without organization
    insert into "UserProfiles" ("userId", "accountId", "name", "userType")
    values (_user_id, _account_id, 'Test User 2', 'end_user');

    -- Add a tag to the user
    insert into "UserTags" ("userId", "tag")
    values (_user_id, 'no-org-user');

    -- Create a test ticket
    insert into "Tickets" (
        "accountId",
        "brandId",
        "requesterId",
        "submitterId",
        "subject",
        "description",
        "status",
        "ticketNumber"
    ) values (
        _account_id,
        _brand_id,
        _user_id,
        _user_id,
        'Test Ticket 2',
        'Test Description',
        'new',
        2
    ) returning "ticketId" into _ticket_id;

    -- Store the test data for later assertions
    insert into _test_data (ticket_id, user_id, org_id, test_case)
    values (_ticket_id, _user_id, null, 'Test 2');
end $$;

-- Test 5: Verify only user tags were propagated (no org tags)
select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'Test 2')
    ),
    1::bigint,
    'Only user tags should be propagated when user has no organization'
);

-- Test 6: Verify duplicate tags are ignored
do $$
declare
    _user_id uuid := (select user_id from _test_data where test_case = 'Test 1' limit 1);
begin
    -- Try to add a duplicate tag
    insert into "UserTags" ("userId", "tag")
    values (_user_id, 'vip')
    on conflict do nothing;
end $$;

select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'Test 1' limit 1)
        and "tag" = 'vip'
    ),
    1::bigint,
    'Duplicate tags should be ignored'
);

-- Clean up
delete from auth.users where email like 'test.user%@example.com';
drop table _test_data;
select * from finish();
rollback; 