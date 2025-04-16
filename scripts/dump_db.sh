#!/bin/bash

# Dump only the public schema data
echo "Dumping public schema data to seed_data_only.sql..."
pg_dump --data-only \
  --column-inserts \
  --schema public \
  -h localhost -p 54322 -U postgres postgres > seed_data_only.sql

# Dump both public and auth schemas data
echo "Dumping public and auth schemas data to seed_data_with_auth.sql..."
pg_dump --data-only \
  --column-inserts \
  --schema public --schema auth \
  -h localhost -p 54322 -U postgres postgres > seed_data_with_auth.sql

echo "Database dumps completed." 