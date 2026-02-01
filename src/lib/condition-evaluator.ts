/**
 * Condition Evaluator
 *
 * Evaluates achievement conditions against domain event payloads.
 * Conditions are stored as JSON TEXT in the achievements table.
 * All conditions use AND logic — every condition must match.
 * Empty conditions (null/[]) match all events (backward compatible).
 */

export interface Condition {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

/**
 * Extract a nested value from an object using a dot-path.
 * e.g., getNestedValue({ a: { b: 5 } }, "a.b") => 5
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Evaluate a single condition against a payload. */
function evaluateCondition(condition: Condition, payload: Record<string, unknown>): boolean {
  const actual = getNestedValue(payload, condition.field);
  if (actual === undefined) return false;

  switch (condition.op) {
    case 'eq':
      return actual === condition.value;
    case 'neq':
      return actual !== condition.value;
    case 'gt':
      return typeof actual === 'number' && typeof condition.value === 'number'
        && actual > condition.value;
    case 'gte':
      return typeof actual === 'number' && typeof condition.value === 'number'
        && actual >= condition.value;
    case 'lt':
      return typeof actual === 'number' && typeof condition.value === 'number'
        && actual < condition.value;
    case 'lte':
      return typeof actual === 'number' && typeof condition.value === 'number'
        && actual <= condition.value;
    case 'in':
      return Array.isArray(condition.value) && (condition.value as unknown[]).includes(actual);
    case 'contains':
      return typeof actual === 'string' && typeof condition.value === 'string'
        && actual.includes(condition.value);
    default:
      return false;
  }
}

/** Parse conditions from the JSON TEXT column. Returns [] on null/invalid. */
export function parseConditions(raw: string | null | undefined): Condition[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Evaluate ALL conditions against a payload (AND logic).
 * Returns true if conditions is empty (no filtering = match all).
 */
export function evaluateConditions(
  conditions: Condition[],
  payload: Record<string, unknown>,
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, payload));
}
