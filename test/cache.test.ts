import { expect } from 'chai';
import { generateDataHash } from '../src/cache.js';

describe('Cache', () => {
  describe('generateDataHash()', () => {
    it('should generate consistent hash for same data', () => {
      const data = '{"events": [{"id": "1"}]}';
      const hash1 = generateDataHash(data);
      const hash2 = generateDataHash(data);

      expect(hash1).to.equal(hash2);
    });

    it('should generate different hashes for different data', () => {
      const data1 = '{"events": [{"id": "1"}]}';
      const data2 = '{"events": [{"id": "2"}]}';

      const hash1 = generateDataHash(data1);
      const hash2 = generateDataHash(data2);

      expect(hash1).to.not.equal(hash2);
    });

    it('should return a string hash', () => {
      const data = '{"events": []}';
      const hash = generateDataHash(data);

      expect(hash).to.be.a('string');
      expect(hash.length).to.be.greaterThan(0);
    });

    it('should handle empty string', () => {
      const hash = generateDataHash('');

      expect(hash).to.be.a('string');
      expect(hash).to.equal('0');
    });

    it('should handle large data strings', () => {
      const largeData = JSON.stringify({
        events: Array(1000).fill({ id: 'test', title: 'Test Event' }),
      });

      const hash = generateDataHash(largeData);

      expect(hash).to.be.a('string');
      expect(hash.length).to.be.greaterThan(0);
    });
  });
});
