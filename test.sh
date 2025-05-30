# 1. Define an admin URL pointing at the maintenance DB
export ADMIN_URL="postgresql://postgres:TSnFU4uXXyPQW22fzcbKV@core-db-instance-1-eu-north-1b.c3sc2kgwaxgs.eu-north-1.rds.amazonaws.com:5432/postgres"

# 2. Drop the existing preprod databases if they exist
#    - Drop core-preprod
psql "$ADMIN_URL" -c 'DROP DATABASE IF EXISTS "core-preprod";'
#    - Drop client-preprod
psql "$ADMIN_URL" -c 'DROP DATABASE IF EXISTS "client-preprod";'

# 3. Recreate empty preprod databases
#    - Create core-preprod owned by postgres
psql "$ADMIN_URL" -c 'CREATE DATABASE "core-preprod" OWNER postgres;'
#    - Create client-preprod owned by postgres
psql "$ADMIN_URL" -c 'CREATE DATABASE "client-preprod" OWNER postgres;'

# 4. Restore from the production dumps
#    - Restore core-preprod from dumps/prod.dump
export CORE_PREPROD_URL="postgresql://postgres:TSnFU4uXXyPQW22fzcbKV@core-db-instance-1-eu-north-1b.c3sc2kgwaxgs.eu-north-1.rds.amazonaws.com:5432/core-preprod"
pg_restore --format=custom --jobs=4 --verbose --dbname="$CORE_PREPROD_URL" dumps/prod.dump

#    - Restore client-preprod from client-dumps/client-prod.dump
export CLIENT_PREPROD_URL="postgresql://postgres:TSnFU4uXXyPQW22fzcbKV@core-db-instance-1-eu-north-1b.c3sc2kgwaxgs.eu-north-1.rds.amazonaws.com:5432/client-preprod"
pg_restore --format=custom --jobs=4 --verbose --dbname="$CLIENT_PREPROD_URL" client-dumps/client-prod.dump
