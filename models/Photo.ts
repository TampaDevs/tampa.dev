import { z } from 'zod';

/**
 * Zod schema for photo data
 * Provider-agnostic photo representation
 */
export const PhotoSchema = z.object({
  id: z.string(),
  baseUrl: z.string().url(),
}).strict();

export type PhotoData = z.infer<typeof PhotoSchema>;

/**
 * Photo model
 * Represents an image associated with an event or group
 */
export class Photo {
  readonly id: string;
  readonly baseUrl: string;

  constructor(data: PhotoData) {
    const validated = PhotoSchema.parse(data);
    this.id = validated.id;
    this.baseUrl = validated.baseUrl;
  }

  /**
   * Get the full URL for this photo
   * Can be extended in the future to support different sizes, formats, etc.
   */
  get url(): string {
    return this.baseUrl;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): PhotoData {
    return {
      id: this.id,
      baseUrl: this.baseUrl,
    };
  }
}
