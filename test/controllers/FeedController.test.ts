import { describe, it } from 'mocha';
import { expect } from 'chai';
import { FeedController } from '../../src/controllers/FeedController.js';
import { allTestEvents } from '../fixtures/events.js';

describe('FeedController', () => {
  describe('generateRSS()', () => {
    it('should generate valid RSS feed', () => {
      const request = new Request('http://localhost:8787/rss');
      const rss = FeedController.generateRSS(allTestEvents, request);

      expect(rss).to.be.a('string');
      expect(rss).to.include('<?xml version="1.0" encoding="UTF-8"?>');
      expect(rss).to.include('<rss version="2.0"');
      expect(rss).to.include('<channel>');
      expect(rss).to.include('</channel>');
      expect(rss).to.include('</rss>');
    });

    it('should include event items', () => {
      const request = new Request('http://localhost:8787/rss');
      const rss = FeedController.generateRSS(allTestEvents, request);

      expect(rss).to.include('<item>');
      expect(rss).to.include('<title>');
      expect(rss).to.include('<link>');
      expect(rss).to.include('<guid');
    });

    it('should include event titles', () => {
      const request = new Request('http://localhost:8787/rss');
      const rss = FeedController.generateRSS(allTestEvents, request);

      // Check for at least one event title
      const hasEventTitle = allTestEvents.some(event => rss.includes(event.title));
      expect(hasEventTitle).to.be.true;
    });

    it('should handle empty events array', () => {
      const request = new Request('http://localhost:8787/rss');
      const rss = FeedController.generateRSS([], request);

      expect(rss).to.be.a('string');
      expect(rss).to.include('<channel>');
      expect(rss).to.include('</channel>');
    });
  });

  describe('generateICal()', () => {
    it('should generate valid iCalendar feed', () => {
      const ical = FeedController.generateICal(allTestEvents);

      expect(ical).to.be.a('string');
      expect(ical).to.include('BEGIN:VCALENDAR');
      expect(ical).to.include('END:VCALENDAR');
      expect(ical).to.include('VERSION:2.0');
    });

    it('should include event entries', () => {
      const ical = FeedController.generateICal(allTestEvents);

      expect(ical).to.include('BEGIN:VEVENT');
      expect(ical).to.include('END:VEVENT');
      expect(ical).to.include('SUMMARY:');
      expect(ical).to.include('DTSTART:');
    });

    it('should include event summaries', () => {
      const ical = FeedController.generateICal(allTestEvents);

      // Check for at least one event title in summary
      const hasEventTitle = allTestEvents.some(event => ical.includes(event.title));
      expect(hasEventTitle).to.be.true;
    });

    it('should handle empty events array', () => {
      const ical = FeedController.generateICal([]);

      expect(ical).to.be.a('string');
      expect(ical).to.include('BEGIN:VCALENDAR');
      expect(ical).to.include('END:VCALENDAR');
    });

    it('should include calendar metadata', () => {
      const ical = FeedController.generateICal(allTestEvents);

      expect(ical).to.include('PRODID:');
      expect(ical).to.include('CALSCALE:GREGORIAN');
    });
  });
});
