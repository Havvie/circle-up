// An in-memory implementation of the storage interface the service layer uses.
// The server's MongoDB repository implements the same four methods, so the same business
// logic runs in the browser demo, in the tests, and against a real database.
//
// Filters work like simple MongoDB equality filters: { field: value } matches when the field
// equals the value, or, for array fields, when the array contains it.

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function matches(doc, filter = {}) {
  return Object.entries(filter).every(([k, v]) => {
    const field = doc[k];
    if (v && typeof v === 'object' && Array.isArray(v.$in)) return v.$in.includes(field);
    return Array.isArray(field) ? field.includes(v) : field === v;
  });
}

export function createMemoryRepo(initial = {}, onChange = () => {}) {
  const data = clone(initial);
  const coll = (name) => (data[name] ??= []);
  return {
    async find(name, filter) {
      return clone(coll(name).filter((d) => matches(d, filter)));
    },
    async get(name, id) {
      return clone(coll(name).find((d) => d.id === id) ?? null);
    },
    async insert(name, doc) {
      coll(name).push(clone(doc));
      onChange(data);
      return clone(doc);
    },
    async update(name, id, patch) {
      const doc = coll(name).find((d) => d.id === id);
      if (!doc) return null;
      Object.assign(doc, clone(patch));
      onChange(data);
      return clone(doc);
    },
    snapshot: () => clone(data),
  };
}
