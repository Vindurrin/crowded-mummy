// Keys we never store. Matches the whole key name, not part of a word.
const FORBIDDEN = /^(ssn|pin|claim_?number|claim_?id|bank.*|account_?number|routing.*)$/i;

// Walk any object. Return the path of each forbidden key.
export function findForbidden(value, path = '') {
  if (value === null || typeof value !== 'object') return [];
  const found = [];
  for (const [key, child] of Object.entries(value)) {
    const here = path ? `${path}.${key}` : key;
    if (FORBIDDEN.test(key)) found.push(here);
    found.push(...findForbidden(child, here));
  }
  return found;
}
