import { z } from 'zod';

/**
 * Zod schema for venue data
 */
export const VenueSchema = z.object({
  name: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
}).strict();

export type VenueData = z.infer<typeof VenueSchema>;

/**
 * Constants for special venue types
 */
export const ONLINE_EVENT_VENUE_NAME = 'Online event';

/**
 * Venue model
 * Represents a physical or virtual location for an event
 */
export class Venue {
  readonly name: string;
  readonly address?: string;
  readonly city?: string;
  readonly state?: string;
  readonly postalCode?: string;
  readonly lat?: number;
  readonly lon?: number;

  constructor(data: VenueData) {
    const validated = VenueSchema.parse(data);
    this.name = validated.name;
    this.address = validated.address;
    this.city = validated.city;
    this.state = validated.state;
    this.postalCode = validated.postalCode;
    this.lat = validated.lat;
    this.lon = validated.lon;
  }

  /**
   * Check if this is an online/virtual event
   */
  get isOnline(): boolean {
    return this.name === ONLINE_EVENT_VENUE_NAME;
  }

  /**
   * Check if this venue has valid coordinates
   */
  get hasCoordinates(): boolean {
    return this.lat !== undefined && this.lon !== undefined;
  }

  /**
   * Get formatted address string
   * Returns null for online events or venues without address
   */
  get formattedAddress(): string | null {
    if (this.isOnline) {
      return null;
    }

    const parts: string[] = [];

    if (this.address) parts.push(this.address);
    if (this.city) parts.push(this.city);
    if (this.state) parts.push(this.state);
    if (this.postalCode) parts.push(this.postalCode);

    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Get Google Maps URL for this venue
   * Returns null for online events or venues without enough location data
   */
  get googleMapsUrl(): string | null {
    if (this.isOnline) {
      return null;
    }

    // Prefer address for better UX (shows venue name in Maps)
    const address = this.formattedAddress;
    if (address) {
      const query = encodeURIComponent(address);
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    // Fall back to coordinates
    if (this.hasCoordinates) {
      return `https://www.google.com/maps/search/?api=1&query=${this.lat},${this.lon}`;
    }

    return null;
  }

  /**
   * Get formatted address as HTML-safe string
   */
  get formattedAddressHTML(): string {
    const address = this.formattedAddress;
    if (!address) {
      return this.isOnline ? 'Online event' : '';
    }

    // Escape HTML special characters
    return address
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Serialize to JSON
   */
  toJSON(): VenueData {
    return {
      name: this.name,
      ...(this.address && { address: this.address }),
      ...(this.city && { city: this.city }),
      ...(this.state && { state: this.state }),
      ...(this.postalCode && { postalCode: this.postalCode }),
      ...(this.lat !== undefined && { lat: this.lat }),
      ...(this.lon !== undefined && { lon: this.lon }),
    };
  }
}
