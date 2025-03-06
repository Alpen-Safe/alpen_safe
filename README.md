# Alpen Vault

## Run

```
supabase start
```

```
deno task dev
```

## Develop

```
deno task fmt
```

## Updating the DB schema
Every DB schema update has to be done trough migrations. The full schema history from inception is available under `supabase/migrations` folder. Follow those steps to create a new migration.

1. Create new migration
```
supabase migration new schema_test
```
2. Write out the schema updates in SQL in `supabase/migrations/{timestamp}_schema_test.sql`
3. Run to test out the migration locally
```
supabase db reset
```
4. Update db schema type file with the changes from the local database
```
npx supabase gen types --lang=typescript --local > database.types.ts
```
5. You can now commit your changes which will auto deploy your migrations to respecitve environments