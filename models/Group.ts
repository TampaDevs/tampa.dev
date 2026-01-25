import { z } from 'zod';
import { Photo, PhotoSchema } from './Photo.js';

/**
 * Zod schema for group data
 * Core fields common across event providers
 */
export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  urlname: z.string(),
  link: z.string().url(),
  memberCount: z.number().int().nonnegative(),
  photo: PhotoSchema.optional(),
  // Provider-specific data can be stored here
  extras: z.record(z.unknown()).optional(),
}).strict();

export type GroupData = z.infer<typeof GroupSchema>;

/**
 * Group model
 * Represents an organization or community that hosts events
 */
export class Group {
  readonly id: string;
  readonly name: string;
  readonly urlname: string;
  readonly link: string;
  readonly memberCount: number;
  readonly photo?: Photo;
  readonly extras?: Record<string, unknown>;

  constructor(data: GroupData) {
    const validated = GroupSchema.parse(data);
    this.id = validated.id;
    this.name = validated.name;
    this.urlname = validated.urlname;
    this.link = validated.link;
    this.memberCount = validated.memberCount;
    this.photo = validated.photo ? new Photo(validated.photo) : undefined;
    this.extras = validated.extras;
  }

  /**
   * Get the photo URL for this group
   * Returns null if no photo is available
   */
  get photoUrl(): string | null {
    return this.photo?.url ?? null;
  }

  /**
   * Check if this group has a photo
   */
  get hasPhoto(): boolean {
    return this.photo !== undefined;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): GroupData {
    return {
      id: this.id,
      name: this.name,
      urlname: this.urlname,
      link: this.link,
      memberCount: this.memberCount,
      ...(this.photo && { photo: this.photo.toJSON() }),
      ...(this.extras && { extras: this.extras }),
    };
  }
}
