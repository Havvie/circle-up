import bcrypt from 'bcryptjs';
import { buildSampleData } from '../../shared/sampleData.js';

// Every sample account shares one password, for local development only.
export const DEMO_PASSWORD = 'circle-up-demo';

export async function sampleDataWithPasswords(now = new Date()) {
  const data = buildSampleData(now);
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  data.users = data.users.map((u) => ({ ...u, passwordHash: hash }));
  return data;
}

export async function seed(repo, now = new Date()) {
  const data = await sampleDataWithPasswords(now);
  for (const [name, docs] of Object.entries(data)) for (const doc of docs) await repo.insert(name, doc);
  return data;
}
