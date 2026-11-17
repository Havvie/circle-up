import http from 'node:http';
import { createApp } from './app.js';
import { attachRealtime } from './realtime.js';
import { createMongoRepo } from './mongoRepo.js';
import { createMemoryRepo } from '../../shared/memoryRepo.js';
import { DEMO_PASSWORD, sampleDataWithPasswords, seed } from './seedData.js';

const PORT = Number(process.env.PORT ?? 4000);
const JWT_SECRET = process.env.JWT_SECRET ?? (process.env.NODE_ENV === 'production' ? null : 'dev-only-secret');
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';

let repo;
if (process.env.MONGO_URL) {
  repo = await createMongoRepo(process.env.MONGO_URL);
  if ((await repo.count('users')) === 0) {
    await seed(repo);
    console.log(`Empty database: loaded sample data. Sample accounts use the password "${DEMO_PASSWORD}".`);
  }
  console.log('Using MongoDB.');
} else {
  repo = createMemoryRepo(await sampleDataWithPasswords());
  console.log(`No MONGO_URL set: using in-memory sample data (resets on restart). Password for sample accounts: "${DEMO_PASSWORD}".`);
}

const app = createApp({ repo, jwtSecret: JWT_SECRET, corsOrigin: CORS_ORIGIN });
const server = http.createServer(app);
attachRealtime(server, app, { jwtSecret: JWT_SECRET, corsOrigin: CORS_ORIGIN });
server.listen(PORT, () => console.log(`Circle Up API on http://localhost:${PORT}`));
