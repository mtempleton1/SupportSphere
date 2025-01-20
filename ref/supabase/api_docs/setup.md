Create a Supabase project
Go to database.new and create a new Supabase project.

When your project is up and running, go to the Table Editor, create a new table and insert some data.

Alternatively, you can run the following snippet in your project's SQL Editor. This will create a countries table with some sample data.

SQL_EDITOR

-- Create the table
create table countries (
  id bigint primary key generated always as identity,
  name text not null
);
-- Insert some sample data into the table
insert into countries (name)
values
  ('Canada'),
  ('United States'),
  ('Mexico');

alter table countries enable row level security;
Make the data in your table publicly readable by adding an RLS policy:

SQL_EDITOR

create policy "public can read countries"
on public.countries
for select to anon
using (true);
2
Create a React app
Create a React app using a Vite template.

Terminal

npm create vite@latest my-app -- --template react
3
Install the Supabase client library
The fastest way to get started is to use the supabase-js client library which provides a convenient interface for working with Supabase from a React app.

Navigate to the React app and install supabase-js.

Terminal

cd my-app && npm install @supabase/supabase-js
4
Query data from the app
In App.jsx, create a Supabase client using your project URL and public API (anon) key:

Project URL
matt.templeton@gauntletai.com's Org / Scratch
https://vhyshcwkqursyslxuyon.supabase.co

Anon key
matt.templeton@gauntletai.com's Org / Scratch
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoeXNoY3drcXVyc3lzbHh1eW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczMDUyNjksImV4cCI6MjA1Mjg4MTI2OX0.AwCowOAyJjhBIZrW-fAqJDdxbxMcMk1RzMyCcE4Jezk

Add a getCountries function to fetch the data and display the query result to the page.

src/App.jsx

  import { useEffect, useState } from "react";
  import { createClient } from "@supabase/supabase-js";

  const supabase = createClient("https://<project>.supabase.co", "<your-anon-key>");

  function App() {
    const [countries, setCountries] = useState([]);

    useEffect(() => {
      getCountries();
    }, []);

    async function getCountries() {
      const { data } = await supabase.from("countries").select();
      setCountries(data);
    }

    return (
      <ul>
        {countries.map((country) => (
          <li key={country.name}>{country.name}</li>
        ))}
      </ul>
    );
  }

  export default App;
5
Start the app
Start the app, go to http://localhost:5173 in a browser, and open the browser console and you should see the list of countries.

Terminal

npm run dev