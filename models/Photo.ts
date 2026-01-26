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
   * Get the full URL for this photo at a standard size
   * Format: {baseUrl}{id}/{width}x{height}.webp
   */
  get url(): string {
    return `${this.baseUrl}${this.id}/676x380.webp`;
  }

  /**
   * Get a photo URL at a specific size
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @param format - Image format (default: webp)
   */
  getUrl(width: number, height: number, format: string = 'webp'): string {
    return `${this.baseUrl}${this.id}/${width}x${height}.${format}`;
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
