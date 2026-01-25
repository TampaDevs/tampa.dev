import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  EventSchema,
  GroupSchema,
  VenueSchema,
  PhotoSchema,
  MeetupDataSchema,
} from '../models/index.js';

/**
 * Generate JSON Schema from Zod schemas
 * These schemas can be served via API or saved as static files
 */

export interface SchemaInfo {
  name: string;
  title: string;
  description: string;
  schema: Record<string, unknown>;
}

/**
 * Get all available schemas
 */
export function getAllSchemas(): Record<string, SchemaInfo> {
  return {
    event: getEventSchema(),
    group: getGroupSchema(),
    venue: getVenueSchema(),
    photo: getPhotoSchema(),
    meetup: getMeetupSchema(),
  };
}

/**
 * Get Event JSON Schema
 */
export function getEventSchema(): SchemaInfo {
  return {
    name: 'Event',
    title: 'Event Schema',
    description: 'Schema for event data - core fields common across event providers',
    // @ts-expect-error - zod-to-json-schema type compatibility issue
    schema: zodToJsonSchema(EventSchema, 'Event') as Record<string, unknown>,
  };
}

/**
 * Get Group JSON Schema
 */
export function getGroupSchema(): SchemaInfo {
  return {
    name: 'Group',
    title: 'Group Schema',
    description: 'Schema for group/organization data',
    // @ts-expect-error - zod-to-json-schema type compatibility issue
    schema: zodToJsonSchema(GroupSchema, 'Group') as Record<string, unknown>,
  };
}

/**
 * Get Venue JSON Schema
 */
export function getVenueSchema(): SchemaInfo {
  return {
    name: 'Venue',
    title: 'Venue Schema',
    description: 'Schema for venue/location data',
    // @ts-expect-error - zod-to-json-schema type compatibility issue
    schema: zodToJsonSchema(VenueSchema, 'Venue') as Record<string, unknown>,
  };
}

/**
 * Get Photo JSON Schema
 */
export function getPhotoSchema(): SchemaInfo {
  return {
    name: 'Photo',
    title: 'Photo Schema',
    description: 'Schema for photo data',
    // @ts-expect-error - zod-to-json-schema type compatibility issue
    schema: zodToJsonSchema(PhotoSchema, 'Photo') as Record<string, unknown>,
  };
}

/**
 * Get Meetup Provider JSON Schema
 */
export function getMeetupSchema(): SchemaInfo {
  return {
    name: 'MeetupData',
    title: 'Meetup API Data Schema',
    description: 'Schema for Meetup API response data (provider-specific)',
    // @ts-expect-error - zod-to-json-schema type compatibility issue
    schema: zodToJsonSchema(MeetupDataSchema, 'MeetupData') as Record<string, unknown>,
  };
}

/**
 * Get schema by name
 */
export function getSchemaByName(name: string): SchemaInfo | null {
  const schemas = getAllSchemas();
  return schemas[name.toLowerCase()] ?? null;
}

/**
 * Get list of available schema names
 */
export function getSchemaNames(): string[] {
  return Object.keys(getAllSchemas());
}
