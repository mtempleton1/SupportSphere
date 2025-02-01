-- Function to execute raw queries with proper security checks
CREATE OR REPLACE FUNCTION execute_raw_query(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with privileges of function creator
AS $$
DECLARE
    result jsonb;
BEGIN
    -- Basic security checks
    IF query ~* 'drop|truncate|delete|update|insert|alter|create|grant' THEN
        RAISE EXCEPTION 'Unauthorized query type detected';
    END IF;

    -- Execute the query and convert results to JSON
    EXECUTE format('
        WITH query_result AS (%s)
        SELECT jsonb_agg(to_jsonb(query_result.*))
        FROM query_result;
    ', query) INTO result;

    RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and return a safe error message
        RAISE NOTICE 'Query execution failed: %', SQLERRM;
        RETURN jsonb_build_object(
            'error', true,
            'message', 'Query execution failed: ' || SQLERRM
        );
END;
$$; 