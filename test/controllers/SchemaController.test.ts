import { describe, it } from 'mocha';
import { expect } from 'chai';
import { SchemaController } from '../../src/controllers/SchemaController.js';

describe('SchemaController', () => {
  describe('getAllSchemas()', () => {
    it('should return all available schemas', () => {
      const schemas = SchemaController.getAllSchemas();

      expect(schemas).to.be.an('array');
      expect(schemas.length).to.be.greaterThan(0);

      schemas.forEach(schema => {
        expect(schema).to.have.property('name');
        expect(schema).to.have.property('title');
        expect(schema).to.have.property('description');
        expect(schema).to.have.property('url');
      });
    });

    it('should include event schema', () => {
      const schemas = SchemaController.getAllSchemas();
      const eventSchema = schemas.find(s => s.name === 'event');

      expect(eventSchema).to.exist;
      expect(eventSchema?.title).to.equal('Event Schema');
      expect(eventSchema?.url).to.include('/schemas/event');
    });

    it('should include group schema', () => {
      const schemas = SchemaController.getAllSchemas();
      const groupSchema = schemas.find(s => s.name === 'group');

      expect(groupSchema).to.exist;
      expect(groupSchema?.title).to.equal('Group Schema');
    });

    it('should include venue schema', () => {
      const schemas = SchemaController.getAllSchemas();
      const venueSchema = schemas.find(s => s.name === 'venue');

      expect(venueSchema).to.exist;
      expect(venueSchema?.title).to.equal('Venue Schema');
    });

    it('should include photo schema', () => {
      const schemas = SchemaController.getAllSchemas();
      const photoSchema = schemas.find(s => s.name === 'photo');

      expect(photoSchema).to.exist;
      expect(photoSchema?.title).to.equal('Photo Schema');
    });

    it('should include meetup schema', () => {
      const schemas = SchemaController.getAllSchemas();
      const meetupSchema = schemas.find(s => s.name === 'meetup');

      expect(meetupSchema).to.exist;
      expect(meetupSchema?.title).to.include('Meetup');
    });
  });

  describe('getSchemaByName()', () => {
    it('should return schema for valid name', () => {
      const schema = SchemaController.getSchemaByName('event');

      expect(schema).to.exist;
      expect(schema).to.be.an('object');
      expect(schema).to.have.property('$ref');
    });

    it('should return null for invalid name', () => {
      const schema = SchemaController.getSchemaByName('nonexistent');

      expect(schema).to.be.null;
    });

    it('should return event schema with correct structure', () => {
      const schema = SchemaController.getSchemaByName('event');

      expect(schema).to.not.be.null;
      expect(schema).to.have.property('$ref');
      expect(schema).to.have.property('definitions');
      expect(schema!.definitions).to.have.property('Event');
    });
  });

  describe('getSchemaNames()', () => {
    it('should return array of schema names', () => {
      const names = SchemaController.getSchemaNames();

      expect(names).to.be.an('array');
      expect(names.length).to.be.greaterThan(0);
      expect(names).to.include('event');
      expect(names).to.include('group');
      expect(names).to.include('venue');
      expect(names).to.include('photo');
      expect(names).to.include('meetup');
    });

    it('should return only string values', () => {
      const names = SchemaController.getSchemaNames();

      names.forEach(name => {
        expect(name).to.be.a('string');
        expect(name.length).to.be.greaterThan(0);
      });
    });
  });
});
