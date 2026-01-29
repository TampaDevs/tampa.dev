import { z } from 'zod';

/**
 * Zod schema for photo data
 * Provider-agnostic photo representation
 *
 * For Meetup: baseUrl + id are used to construct sized URLs
 * For other providers: directUrl contains the full image URL
 */
export const PhotoSchema = z.object({
  id: z.string(),
  baseUrl: z.string().url().optional(),
  directUrl: z.string().url().optional(),
}).strict();

export type PhotoData = z.infer<typeof PhotoSchema>;

/**
 * Photo model
 * Represents an image associated with an event or group
 */
export class Photo {
  readonly id: string;
  readonly baseUrl?: string;
  readonly directUrl?: string;

  constructor(data: PhotoData) {
    const validated = PhotoSchema.parse(data);
    this.id = validated.id;
    this.baseUrl = validated.baseUrl;
    this.directUrl = validated.directUrl;
  }

  /**
   * Get the full URL for this photo at a standard size
   * For Meetup: constructs {baseUrl}{id}/{width}x{height}.webp
   * For others: returns the direct URL
   */
  get url(): string {
    if (this.directUrl) {
      return this.directUrl;
    }
    if (this.baseUrl) {
      return `${this.baseUrl}${this.id}/676x380.webp`;
    }
    return this.id; // Fallback to id as URL
  }

  /**
   * Get a photo URL at a specific size
   * Only works for Meetup-style URLs with baseUrl
   * @param width - Width in pixels
   * @param height - Height in pixels
   * @param format - Image format (default: webp)
   */
  getUrl(width: number, height: number, format: string = 'webp'): string {
    if (this.baseUrl) {
      return `${this.baseUrl}${this.id}/${width}x${height}.${format}`;
    }
    // For direct URLs, return as-is (can't resize)
    return this.url;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): PhotoData {
    return {
      id: this.id,
      ...(this.baseUrl && { baseUrl: this.baseUrl }),
      ...(this.directUrl && { directUrl: this.directUrl }),
    };
  }
}
