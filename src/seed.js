// Read the seed file. The seed file holds the numbers. We do not retype them.

// Config keys the seed must not use. The app writes them itself.
const RESERVED = ['answers', 'seedLoadedAt'];
const REQUIRED = ['meta', 'routines', 'training', 'nutrition', 'path', 'gates', 'jobSearch', 'unemployment', 'gamification'];

// Return a list of problems. An empty list means the seed is fine.
export function checkSeed(seed) {
  if (!seed || typeof seed !== 'object' || Array.isArray(seed)) return ['Seed is not an object.'];
  const problems = [];
  for (const key of REQUIRED) {
    if (!(key in seed)) problems.push(`Seed has no "${key}" section.`);
  }
  for (const key of RESERVED) {
    if (key in seed) problems.push(`Seed must not use the key "${key}".`);
  }
  if (!Array.isArray(seed.path)) problems.push('"path" must be a list.');
  if (!Array.isArray(seed.nutrition?.items)) problems.push('"nutrition.items" must be a list.');
  return problems;
}

// One config entry per top-level section.
export function seedToConfig(seed, now = new Date()) {
  return { ...seed, seedLoadedAt: now.toISOString() };
}

// Find every blank (null) value. The app shows these and asks. It never guesses.
// Items with an "id" show as path.id.field, so the list is easy to read.
export function findBlanks(value, path = '') {
  if (value === null) return [path];
  if (typeof value !== 'object') return [];
  const blanks = [];
  for (const [key, child] of Object.entries(value)) {
    const name = Array.isArray(value) && child?.id ? child.id : key;
    blanks.push(...findBlanks(child, path ? `${path}.${name}` : name));
  }
  return blanks;
}
