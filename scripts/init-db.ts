import { ensureDatabaseSchema } from '../lib/db';

async function main() {
  await ensureDatabaseSchema();
  console.log('Database schema initialized.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
