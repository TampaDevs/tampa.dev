import { describe, it } from 'mocha';
import { expect } from 'chai';
import {
  getNestedValue,
  parseConditions,
  evaluateConditions,
  type Condition,
} from '../../src/lib/condition-evaluator.js';

describe('Condition Evaluator', () => {
  describe('getNestedValue', () => {
    it('should extract a top-level field', () => {
      expect(getNestedValue({ score: 42 }, 'score')).to.equal(42);
    });

    it('should extract a nested field via dot-path', () => {
      expect(getNestedValue({ a: { b: { c: 'deep' } } }, 'a.b.c')).to.equal('deep');
    });

    it('should return undefined for missing top-level field', () => {
      expect(getNestedValue({ foo: 1 }, 'bar')).to.be.undefined;
    });

    it('should return undefined for missing nested field', () => {
      expect(getNestedValue({ a: { b: 1 } }, 'a.c.d')).to.be.undefined;
    });

    it('should return undefined when traversing through null', () => {
      expect(getNestedValue({ a: null } as Record<string, unknown>, 'a.b')).to.be.undefined;
    });

    it('should return undefined when traversing through a primitive', () => {
      expect(getNestedValue({ a: 5 }, 'a.b')).to.be.undefined;
    });

    it('should handle empty path part (empty string key)', () => {
      const obj = { '': 'empty-key' };
      expect(getNestedValue(obj, '')).to.equal('empty-key');
    });

    it('should extract boolean values', () => {
      expect(getNestedValue({ active: true }, 'active')).to.equal(true);
      expect(getNestedValue({ active: false }, 'active')).to.equal(false);
    });

    it('should extract string values', () => {
      expect(getNestedValue({ name: 'tampa-devs' }, 'name')).to.equal('tampa-devs');
    });

    it('should extract array values', () => {
      const arr = [1, 2, 3];
      expect(getNestedValue({ items: arr }, 'items')).to.deep.equal(arr);
    });
  });

  describe('parseConditions', () => {
    it('should return empty array for null', () => {
      expect(parseConditions(null)).to.deep.equal([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseConditions(undefined)).to.deep.equal([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseConditions('')).to.deep.equal([]);
    });

    it('should return empty array for invalid JSON', () => {
      expect(parseConditions('not json')).to.deep.equal([]);
    });

    it('should return empty array when JSON is not an array', () => {
      expect(parseConditions('{"field": "x"}')).to.deep.equal([]);
    });

    it('should return empty array for JSON number', () => {
      expect(parseConditions('42')).to.deep.equal([]);
    });

    it('should parse a valid conditions array', () => {
      const input = JSON.stringify([
        { field: 'groupSlug', op: 'eq', value: 'tampa-devs' },
      ]);
      const result = parseConditions(input);
      expect(result).to.have.length(1);
      expect(result[0]).to.deep.equal({ field: 'groupSlug', op: 'eq', value: 'tampa-devs' });
    });

    it('should parse multiple conditions', () => {
      const input = JSON.stringify([
        { field: 'totalScore', op: 'gte', value: 10 },
        { field: 'source', op: 'eq', value: 'claim-link' },
      ]);
      const result = parseConditions(input);
      expect(result).to.have.length(2);
    });

    it('should parse empty JSON array', () => {
      expect(parseConditions('[]')).to.deep.equal([]);
    });
  });

  describe('evaluateConditions', () => {
    describe('empty conditions (backward compatibility)', () => {
      it('should return true for empty conditions array', () => {
        expect(evaluateConditions([], { anything: 'here' })).to.be.true;
      });

      it('should return true for empty conditions with empty payload', () => {
        expect(evaluateConditions([], {})).to.be.true;
      });
    });

    describe('eq operator', () => {
      it('should match equal string values', () => {
        const conditions: Condition[] = [{ field: 'groupSlug', op: 'eq', value: 'tampa-devs' }];
        expect(evaluateConditions(conditions, { groupSlug: 'tampa-devs' })).to.be.true;
      });

      it('should not match different string values', () => {
        const conditions: Condition[] = [{ field: 'groupSlug', op: 'eq', value: 'tampa-devs' }];
        expect(evaluateConditions(conditions, { groupSlug: 'other-group' })).to.be.false;
      });

      it('should match equal numeric values', () => {
        const conditions: Condition[] = [{ field: 'count', op: 'eq', value: 5 }];
        expect(evaluateConditions(conditions, { count: 5 })).to.be.true;
      });

      it('should not match when types differ (strict equality)', () => {
        const conditions: Condition[] = [{ field: 'count', op: 'eq', value: '5' }];
        expect(evaluateConditions(conditions, { count: 5 })).to.be.false;
      });

      it('should match boolean values', () => {
        const conditions: Condition[] = [{ field: 'active', op: 'eq', value: true }];
        expect(evaluateConditions(conditions, { active: true })).to.be.true;
      });

      it('should return false when field is missing', () => {
        const conditions: Condition[] = [{ field: 'missing', op: 'eq', value: 'x' }];
        expect(evaluateConditions(conditions, { other: 'y' })).to.be.false;
      });
    });

    describe('neq operator', () => {
      it('should match when values differ', () => {
        const conditions: Condition[] = [{ field: 'status', op: 'neq', value: 'banned' }];
        expect(evaluateConditions(conditions, { status: 'active' })).to.be.true;
      });

      it('should not match when values are equal', () => {
        const conditions: Condition[] = [{ field: 'status', op: 'neq', value: 'active' }];
        expect(evaluateConditions(conditions, { status: 'active' })).to.be.false;
      });

      it('should return false when field is missing (undefined !== value is true, but field missing returns false)', () => {
        const conditions: Condition[] = [{ field: 'missing', op: 'neq', value: 'x' }];
        expect(evaluateConditions(conditions, {})).to.be.false;
      });
    });

    describe('gt operator', () => {
      it('should match when actual is greater', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'gt', value: 10 }];
        expect(evaluateConditions(conditions, { score: 15 })).to.be.true;
      });

      it('should not match when equal', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'gt', value: 10 }];
        expect(evaluateConditions(conditions, { score: 10 })).to.be.false;
      });

      it('should not match when less', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'gt', value: 10 }];
        expect(evaluateConditions(conditions, { score: 5 })).to.be.false;
      });

      it('should return false for non-numeric actual', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'gt', value: 10 }];
        expect(evaluateConditions(conditions, { score: 'fifteen' })).to.be.false;
      });

      it('should return false for non-numeric condition value', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'gt', value: 'ten' }];
        expect(evaluateConditions(conditions, { score: 15 })).to.be.false;
      });
    });

    describe('gte operator', () => {
      it('should match when actual is greater', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'gte', value: 10 }];
        expect(evaluateConditions(conditions, { score: 15 })).to.be.true;
      });

      it('should match when equal', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'gte', value: 10 }];
        expect(evaluateConditions(conditions, { score: 10 })).to.be.true;
      });

      it('should not match when less', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'gte', value: 10 }];
        expect(evaluateConditions(conditions, { score: 5 })).to.be.false;
      });
    });

    describe('lt operator', () => {
      it('should match when actual is less', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'lt', value: 10 }];
        expect(evaluateConditions(conditions, { score: 5 })).to.be.true;
      });

      it('should not match when equal', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'lt', value: 10 }];
        expect(evaluateConditions(conditions, { score: 10 })).to.be.false;
      });

      it('should not match when greater', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'lt', value: 10 }];
        expect(evaluateConditions(conditions, { score: 15 })).to.be.false;
      });
    });

    describe('lte operator', () => {
      it('should match when actual is less', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'lte', value: 10 }];
        expect(evaluateConditions(conditions, { score: 5 })).to.be.true;
      });

      it('should match when equal', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'lte', value: 10 }];
        expect(evaluateConditions(conditions, { score: 10 })).to.be.true;
      });

      it('should not match when greater', () => {
        const conditions: Condition[] = [{ field: 'score', op: 'lte', value: 10 }];
        expect(evaluateConditions(conditions, { score: 15 })).to.be.false;
      });
    });

    describe('in operator', () => {
      it('should match when actual is in the array', () => {
        const conditions: Condition[] = [{ field: 'role', op: 'in', value: ['admin', 'superadmin'] }];
        expect(evaluateConditions(conditions, { role: 'admin' })).to.be.true;
      });

      it('should not match when actual is not in the array', () => {
        const conditions: Condition[] = [{ field: 'role', op: 'in', value: ['admin', 'superadmin'] }];
        expect(evaluateConditions(conditions, { role: 'user' })).to.be.false;
      });

      it('should return false when value is not an array', () => {
        const conditions: Condition[] = [{ field: 'role', op: 'in', value: 'admin' }];
        expect(evaluateConditions(conditions, { role: 'admin' })).to.be.false;
      });

      it('should work with numeric arrays', () => {
        const conditions: Condition[] = [{ field: 'tier', op: 'in', value: [1, 2, 3] }];
        expect(evaluateConditions(conditions, { tier: 2 })).to.be.true;
        expect(evaluateConditions(conditions, { tier: 5 })).to.be.false;
      });
    });

    describe('contains operator', () => {
      it('should match when string contains substring', () => {
        const conditions: Condition[] = [{ field: 'name', op: 'contains', value: 'tampa' }];
        expect(evaluateConditions(conditions, { name: 'tampa-devs-meetup' })).to.be.true;
      });

      it('should not match when string does not contain substring', () => {
        const conditions: Condition[] = [{ field: 'name', op: 'contains', value: 'orlando' }];
        expect(evaluateConditions(conditions, { name: 'tampa-devs-meetup' })).to.be.false;
      });

      it('should return false for non-string actual', () => {
        const conditions: Condition[] = [{ field: 'count', op: 'contains', value: '5' }];
        expect(evaluateConditions(conditions, { count: 5 })).to.be.false;
      });

      it('should return false for non-string condition value', () => {
        const conditions: Condition[] = [{ field: 'name', op: 'contains', value: 5 }];
        expect(evaluateConditions(conditions, { name: 'test5' })).to.be.false;
      });
    });

    describe('AND logic (multiple conditions)', () => {
      it('should match when all conditions are satisfied', () => {
        const conditions: Condition[] = [
          { field: 'groupSlug', op: 'eq', value: 'tampa-devs' },
          { field: 'totalScore', op: 'gte', value: 10 },
        ];
        expect(evaluateConditions(conditions, { groupSlug: 'tampa-devs', totalScore: 15 })).to.be.true;
      });

      it('should not match when first condition fails', () => {
        const conditions: Condition[] = [
          { field: 'groupSlug', op: 'eq', value: 'tampa-devs' },
          { field: 'totalScore', op: 'gte', value: 10 },
        ];
        expect(evaluateConditions(conditions, { groupSlug: 'other', totalScore: 15 })).to.be.false;
      });

      it('should not match when second condition fails', () => {
        const conditions: Condition[] = [
          { field: 'groupSlug', op: 'eq', value: 'tampa-devs' },
          { field: 'totalScore', op: 'gte', value: 10 },
        ];
        expect(evaluateConditions(conditions, { groupSlug: 'tampa-devs', totalScore: 5 })).to.be.false;
      });

      it('should not match when both conditions fail', () => {
        const conditions: Condition[] = [
          { field: 'groupSlug', op: 'eq', value: 'tampa-devs' },
          { field: 'totalScore', op: 'gte', value: 10 },
        ];
        expect(evaluateConditions(conditions, { groupSlug: 'other', totalScore: 5 })).to.be.false;
      });
    });

    describe('nested field access', () => {
      it('should evaluate conditions on nested fields', () => {
        const conditions: Condition[] = [{ field: 'user.level', op: 'gte', value: 3 }];
        expect(evaluateConditions(conditions, { user: { level: 5 } })).to.be.true;
      });

      it('should return false for missing nested path', () => {
        const conditions: Condition[] = [{ field: 'user.level', op: 'gte', value: 3 }];
        expect(evaluateConditions(conditions, { user: {} })).to.be.false;
      });
    });

    describe('unknown operator', () => {
      it('should return false for an unrecognized operator', () => {
        const conditions: Condition[] = [{ field: 'x', op: 'regex' as Condition['op'], value: '.*' }];
        expect(evaluateConditions(conditions, { x: 'anything' })).to.be.false;
      });
    });

    describe('real-world scenarios', () => {
      it('should match a check-in event for a specific group', () => {
        const conditions = parseConditions(
          JSON.stringify([{ field: 'groupSlug', op: 'eq', value: 'tampa-devs' }])
        );
        const payload = { userId: 'u1', groupSlug: 'tampa-devs', badgeId: 'b1' };
        expect(evaluateConditions(conditions, payload)).to.be.true;
      });

      it('should match a score threshold achievement', () => {
        const conditions = parseConditions(
          JSON.stringify([{ field: 'totalScore', op: 'gte', value: 10 }])
        );
        const payload = { userId: 'u1', totalScore: 12, previousScore: 8 };
        expect(evaluateConditions(conditions, payload)).to.be.true;
      });

      it('should reject a score threshold achievement when not yet reached', () => {
        const conditions = parseConditions(
          JSON.stringify([{ field: 'totalScore', op: 'gte', value: 10 }])
        );
        const payload = { userId: 'u1', totalScore: 7, previousScore: 5 };
        expect(evaluateConditions(conditions, payload)).to.be.false;
      });

      it('should handle legacy achievement with null conditions', () => {
        const conditions = parseConditions(null);
        expect(evaluateConditions(conditions, { anything: true })).to.be.true;
      });
    });
  });
});
