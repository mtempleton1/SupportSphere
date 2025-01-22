--
-- Test file for database functions
-- Specifically testing the apply_automatic_tag_rules trigger function
--

begin;
select plan(7); -- We'll start with 8 tests

-- Test 1: Verify the function exists
select has_function(
    'apply_automatic_tag_rules',
    'Function apply_automatic_tag_rules should exist'
);

-- Test 2: Verify function return type
select function_returns(
    'apply_automatic_tag_rules',
    'trigger',
    'Function apply_automatic_tag_rules should return trigger'
);

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS apply_automatic_tag_rules_on_ticket ON "Tickets";
CREATE TRIGGER apply_automatic_tag_rules_on_ticket
    AFTER INSERT OR UPDATE OF "description" ON "Tickets"
    FOR EACH ROW
    EXECUTE FUNCTION apply_automatic_tag_rules();

-- Create test data and store IDs for later assertions
create temporary table _test_data (
    ticket_id uuid,
    account_id uuid,
    test_case text
);

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

    -- Get first user ID for this account
    select "userId" into _user_id
    from "UserProfiles"
    where "accountId" = _account_id
    limit 1;

    -- Create test automatic tag rules
    insert into "AutomaticTagRules" ("accountId", "name", "description", "keyword", "tag", "isActive")
    values 
        (_account_id, 'Bug Rule', 'Tag tickets mentioning bugs', 'bug', 'bug', true),
        (_account_id, 'Urgent Rule', 'Tag urgent tickets', 'urgent', 'urgent', true),
        (_account_id, 'Inactive Rule', 'This rule is inactive', 'inactive', 'inactive', false);

    -- Test 3: Create a ticket with no matching keywords
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
        'Regular Ticket',
        'This is a regular ticket without any special keywords',
        'new',
        1
    ) returning "ticketId" into _ticket_id;

    insert into _test_data (ticket_id, account_id, test_case)
    values (_ticket_id, _account_id, 'no_keywords');

    -- Test 4: Create a ticket with one matching keyword
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
        'Bug Report',
        'Found a bug in the system',
        'new',
        2
    ) returning "ticketId" into _ticket_id;

    insert into _test_data (ticket_id, account_id, test_case)
    values (_ticket_id, _account_id, 'one_keyword');

    -- Test 5: Create a ticket with multiple matching keywords
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
        'Urgent Bug',
        'Found an urgent bug that needs immediate attention',
        'new',
        3
    ) returning "ticketId" into _ticket_id;

    insert into _test_data (ticket_id, account_id, test_case)
    values (_ticket_id, _account_id, 'multiple_keywords');

    -- Test 6: Create a ticket with an inactive rule keyword
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
        'Inactive Test',
        'This ticket has the inactive keyword',
        'new',
        4
    ) returning "ticketId" into _ticket_id;

    insert into _test_data (ticket_id, account_id, test_case)
    values (_ticket_id, _account_id, 'inactive_rule');
end $$;

-- Test 3: Verify no tags were added for ticket without keywords
select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'no_keywords')
    ),
    0::bigint,
    'No tags should be added when description has no matching keywords'
);

-- Test 4: Verify one tag was added for ticket with one keyword
select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'one_keyword')
        and "tag" = 'bug'
    ),
    1::bigint,
    'One tag should be added when description has one matching keyword'
);

-- Test 5: Verify multiple tags were added for ticket with multiple keywords
select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'multiple_keywords')
    ),
    2::bigint,
    'Multiple tags should be added when description has multiple matching keywords'
);

-- Test 6: Verify no tag was added for inactive rule
select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'inactive_rule')
    ),
    0::bigint,
    'No tag should be added for inactive rules even if keyword matches'
);

-- Test 7: Update a ticket to add a keyword
do $$
declare
    _ticket_id uuid;
begin
    select ticket_id into _ticket_id
    from _test_data
    where test_case = 'no_keywords';

    update "Tickets"
    set "description" = 'This ticket now has a bug'
    where "ticketId" = _ticket_id;
end $$;

-- Test 8: Verify tag was added after update
select is(
    (
        select count(*)
        from "TicketTags"
        where "ticketId" = (select ticket_id from _test_data where test_case = 'no_keywords')
        and "tag" = 'bug'
    ),
    1::bigint,
    'Tag should be added when ticket is updated with matching keyword'
);

-- Clean up
delete from "AutomaticTagRules" where "name" like 'Bug Rule' or "name" like 'Urgent Rule' or "name" like 'Inactive Rule';
drop table _test_data;
select * from finish();
rollback; 