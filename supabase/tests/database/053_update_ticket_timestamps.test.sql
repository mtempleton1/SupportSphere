--
-- Test file for database functions
-- Specifically testing the update_ticket_timestamps trigger function
--

begin;
select plan(4); -- We'll start with 4 tests

-- Test 1: Verify the function exists
select has_function(
    'update_ticket_timestamps',
    'Function update_ticket_timestamps should exist'
);

-- Test 2: Verify function return type
select function_returns(
    'update_ticket_timestamps',
    'trigger',
    'Function update_ticket_timestamps should return trigger'
);

-- Create test data and store IDs for later assertions
create temporary table _test_data (
    ticket_id uuid,
    created_at timestamp,
    updated_at timestamp
);

do $$
declare
    _ticket_id uuid;
    _account_id uuid;
    _brand_id uuid;
    _user_id uuid;
    _created_at timestamp;
    _updated_at timestamp;
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

    -- Get first user ID for this account
    select "userId" into _user_id
    from "UserProfiles"
    where "accountId" = _account_id
    limit 1;

    -- Add error handling in case we didn't get the required IDs
    if _account_id is null or _brand_id is null or _user_id is null then
        raise exception 'Required IDs not found. Make sure test data exists in Accounts, Brands, and UserProfiles tables';
    end if;

    -- Create the test ticket using existing IDs
    insert into "Tickets" (
        "accountId",
        "brandId",
        "requesterId",
        "submitterId",
        "subject",
        "description",
        "status",
        "ticketNumber",
        "createdAt",
        "updatedAt"
    ) values (
        _account_id,
        _brand_id,
        _user_id,
        _user_id,
        'Test Ticket',
        'Test Description',
        'new',
        1,
        '2024-01-01 00:00:00'::timestamp,
        '2024-01-01 00:00:00'::timestamp
    ) returning "ticketId", "createdAt", "updatedAt" into _ticket_id, _created_at, _updated_at;

    -- Store the test data for later assertions
    insert into _test_data (ticket_id, created_at, updated_at)
    values (_ticket_id, _created_at, _updated_at);

    -- Update the ticket
    update "Tickets" 
    set "subject" = 'Updated Test Ticket'
    where "ticketId" = _ticket_id;
end $$;

-- Test 3: Verify updatedAt changed
select ok(
    (select "updatedAt" from "Tickets" where "ticketId" = (select ticket_id from _test_data)) > '2024-01-01 00:00:00'::timestamp,
    'updatedAt timestamp should be updated when ticket is modified'
);

-- Test 4: Verify createdAt remains unchanged
select is(
    (select "createdAt" from "Tickets" where "ticketId" = (select ticket_id from _test_data)),
    '2024-01-01 00:00:00'::timestamp,
    'createdAt timestamp should remain unchanged when ticket is updated'
);

-- Clean up
drop table _test_data;
select * from finish();
rollback; 