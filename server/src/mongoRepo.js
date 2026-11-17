// MongoDB implementation of the storage interface in shared/memoryRepo.js.
// Documents keep the app's string ids as MongoDB's _id.
import { MongoClient } from 'mongodb';

const toDoc = ({ id, ...rest }) => ({ _id: id, ...rest });
const fromDoc = (doc) => {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
};

export async function createMongoRepo(url, dbName = 'circle_up') {
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db(dbName);
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  await db.collection('messages').createIndex({ conversationId: 1, createdAt: 1 });
  await db.collection('conversations').createIndex({ participants: 1 });

  return {
    async find(name, filter = {}) {
      return (await db.collection(name).find(filter).toArray()).map(fromDoc);
    },
    async get(name, id) {
      return fromDoc(await db.collection(name).findOne({ _id: id }));
    },
    async insert(name, doc) {
      await db.collection(name).insertOne(toDoc(doc));
      return doc;
    },
    async update(name, id, patch) {
      const { id: _ignored, ...fields } = patch;
      const res = await db.collection(name).findOneAndUpdate({ _id: id }, { $set: fields }, { returnDocument: 'after' });
      return fromDoc(res);
    },
    async count(name) {
      return db.collection(name).countDocuments();
    },
    async drop() {
      await db.dropDatabase();
    },
    close: () => client.close(),
  };
}
