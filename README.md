# Alpen Safe

This project has been transformed from Deno to Node.js (TypeScript).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Copy the `.env` file and update as needed:
```bash
cp .env.example .env
```

3. Build the project:
```bash
npm run build
```

## Development

Run the project in development mode:
```bash
npm run dev
```

## Production

Build and run the project in production mode:
```bash
npm run build
npm start
```

## Other Commands

- Format the code: `npm run fmt`
- Type-check the code: `npm run check`
- Run tests: `npm run test`
- Generate seed data: `npm run seed`

## Project Structure

- `main.ts`: Entry point
- `conf.ts`: Configuration
- `controller/`: API controllers
- `model/`: Data models
- `scripts/`: Utility scripts

## Notes on Deno to Node.js Migration

1. Configured imports without file extensions
2. Added package.json and tsconfig.json with proper ESM support
3. Updated import/export syntax to be Node.js compatible
4. Set up equivalent npm scripts to match the original Deno tasks
5. Added experimental specifier resolution for Node.js

# Alpen Vault

## Run

1. Start supabase

```
supabase start
```

2. Start dev watcher

```
deno task dev
```

## Develop

Continuously format the source codde

```
deno task fmt
```

## Updating the DB schema

Every DB schema update has to be done trough migrations. The full schema history
from inception is available under `supabase/migrations` folder. Follow those
steps to create a new migration.

1. Create new migration

```
supabase migration new schema_test
```

2. Write out the schema updates in SQL in
   `supabase/migrations/{timestamp}_schema_test.sql`
3. Run to test out the migration locally

```
supabase db reset
```

4. Update db schema type file with the changes from the local database

```
npx supabase gen types --lang=typescript --local > database.types.ts
```

or run them both together

```
supabase db reset && npx supabase gen types --lang=typescript --local > database.types.ts
```

5. You can now commit your changes which will auto deploy your migrations to
   respecitve environments
