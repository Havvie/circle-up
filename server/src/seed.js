// Reset a MongoDB database to the sample data: MONGO_URL=... npm run seed
import { createMongoRepo } from './mongoRepo.js';
import { DEMO_PASSWORD, seed } from './seedData.js';

if (!process.env.MONGO_URL) {
  console.error('Set MONGO_URL first.');
  process.exit(1);
}
const repo = await createMongoRepo(process.env.MONGO_URL);
await repo.drop();
const repo2 = await createMongoRepo(process.env.MONGO_URL);
await seed(repo2);
console.log(`Seeded. Sample accounts (e.g. jordan@example.com, sam@example.com) use the password "${DEMO_PASSWORD}".`);
await repo.close();
await repo2.close();
