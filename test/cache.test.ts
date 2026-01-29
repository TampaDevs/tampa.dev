import { expect } from 'chai';
import {
  generateDataHash,
  generateHash,
  checkConditionalRequest,
  createNotModifiedResponse,
} from '../src/cache.js';

describe('Cache', () => {
  describe('generateHash()', () => {
    it('should generate consistent hash for same data', () => {
      const data = '{"events": [{"id": "1"}]}';
      const hash1 = generateHash(data);
      const hash2 = generateHash(data);

      expect(hash1).to.equal(hash2);
    });

    it('should generate different hashes for different data', () => {
      const data1 = '{"events": [{"id": "1"}]}';
      const data2 = '{"events": [{"id": "2"}]}';

      const hash1 = generateHash(data1);
      const hash2 = generateHash(data2);

      expect(hash1).to.not.equal(hash2);
    });

    it('should return a string hash', () => {
      const data = '{"events": []}';
      const hash = generateHash(data);

      expect(hash).to.be.a('string');
      expect(hash.length).to.be.greaterThan(0);
    });

    it('should handle empty string', () => {
      const hash = generateHash('');

      expect(hash).to.be.a('string');
      expect(hash).to.equal('0');
    });

    it('should handle large data strings', () => {
      const largeData = JSON.stringify({
        events: Array(1000).fill({ id: 'test', title: 'Test Event' }),
      });

      const hash = generateHash(largeData);

      expect(hash).to.be.a('string');
      expect(hash.length).to.be.greaterThan(0);
    });
  });

  describe('generateDataHash() - backwards compatibility', () => {
    it('should be an alias for generateHash', () => {
      const data = 'test data';
      expect(generateDataHash(data)).to.equal(generateHash(data));
    });
  });

  describe('checkConditionalRequest()', () => {
    it('should return true when ETag matches sync version', () => {
      const syncVersion = 'abc123';
      const request = new Request('http://localhost/test', {
        headers: {
          'If-None-Match': `"${syncVersion}"`,
        },
      });

      expect(checkConditionalRequest(request, syncVersion)).to.be.true;
    });

    it('should return true when ETag matches without quotes', () => {
      const syncVersion = 'abc123';
      const request = new Request('http://localhost/test', {
        headers: {
          'If-None-Match': syncVersion,
        },
      });

      expect(checkConditionalRequest(request, syncVersion)).to.be.true;
    });

    it('should return false when ETag does not match', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'If-None-Match': '"different"',
        },
      });

      expect(checkConditionalRequest(request, 'abc123')).to.be.false;
    });

    it('should return false when no If-None-Match header', () => {
      const request = new Request('http://localhost/test');

      expect(checkConditionalRequest(request, 'abc123')).to.be.false;
    });

    it('should handle weak ETag prefix', () => {
      const syncVersion = 'abc123';
      const request = new Request('http://localhost/test', {
        headers: {
          'If-None-Match': `W/"${syncVersion}"`,
        },
      });

      expect(checkConditionalRequest(request, syncVersion)).to.be.true;
    });
  });

  describe('createNotModifiedResponse()', () => {
    it('should return 304 status', () => {
      const response = createNotModifiedResponse('abc123');
      expect(response.status).to.equal(304);
    });

    it('should include ETag header', () => {
      const syncVersion = 'abc123';
      const response = createNotModifiedResponse(syncVersion);
      expect(response.headers.get('ETag')).to.equal(`"${syncVersion}"`);
    });

    it('should include Cache-Control header', () => {
      const response = createNotModifiedResponse('abc123');
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).to.include('public');
      expect(cacheControl).to.include('max-age=');
    });

    it('should include X-Cache header', () => {
      const response = createNotModifiedResponse('abc123');
      expect(response.headers.get('X-Cache')).to.equal('NOT_MODIFIED');
    });
  });

  // Note: getSyncVersion() and getSyncMetadata() require a real D1 connection
  // and are tested through integration tests.
});
