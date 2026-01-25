import * as schemas from '../../lib/schemas.js';

/**
 * SchemaController
 * Handles JSON schema serving
 */
export class SchemaController {
  /**
   * Get all available schemas
   */
  static getAllSchemas() {
    const allSchemas = schemas.getAllSchemas();
    return Object.entries(allSchemas).map(([key, info]) => ({
      name: key,
      title: info.title,
      description: info.description,
      url: `/2026-01-25/schemas/${key}`,
    }));
  }

  /**
   * Get a specific schema by name
   */
  static getSchemaByName(name: string) {
    const schema = schemas.getSchemaByName(name);
    if (!schema) {
      return null;
    }
    return schema.schema;
  }

  /**
   * Get list of available schema names
   */
  static getSchemaNames(): string[] {
    return schemas.getSchemaNames();
  }
}
