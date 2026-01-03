import { logger } from '../utils/logger';

const SHIP24_API_KEY = process.env.SHIP24_API_KEY;
const SHIP24_API_URL = 'https://api.ship24.com/public/v1';

interface Ship24Tracker {
  trackerId: string;
  trackingNumber: string;
  createdAt: string;
}

interface Ship24TrackingEvent {
  eventId: string;
  trackingNumber: string;
  statusCode: string;
  status: string;
  statusMilestone: string;
  statusCategory: string;
  datetime: string;
  location: {
    city: string;
    state: string;
    country: string;
    countryIso2: string;
  } | null;
}

interface Ship24TrackingResult {
  trackerId: string;
  trackingNumber: string;
  shipment: {
    shipmentId: string;
    statusCode: string;
    statusMilestone: string;
    originCountryCode: string | null;
    destinationCountryCode: string | null;
    delivery: {
      estimatedDeliveryDate: string | null;
      service: string | null;
      signedBy: string | null;
    };
  } | null;
  events: Ship24TrackingEvent[];
}

export interface TrackingInfo {
  trackerId: string;
  trackingNumber: string;
  status: string;
  statusMilestone: 'pending' | 'info_received' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception' | 'unknown';
  isDelivered: boolean;
  deliveredAt: string | null;
  lastUpdate: string | null;
  events: Array<{
    status: string;
    description: string;
    location: string | null;
    datetime: string;
  }>;
}

class Ship24Service {
  private apiKey: string;

  constructor() {
    if (!SHIP24_API_KEY) {
      logger.warn('SHIP24_API_KEY is not set - tracking features will be disabled');
    }
    this.apiKey = SHIP24_API_KEY || '';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Ship24 API key not configured');
    }

    const url = `${SHIP24_API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Ship24 API error', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        endpoint,
      });
      throw new Error(`Ship24 API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a tracker for a tracking number
   * Ship24 will monitor this tracking number for updates
   */
  async createTracker(trackingNumber: string): Promise<Ship24Tracker> {
    logger.info('Creating Ship24 tracker', { trackingNumber });

    const response = await this.request<{ data: { tracker: Ship24Tracker } }>('/trackers', {
      method: 'POST',
      body: JSON.stringify({
        trackingNumber,
      }),
    });

    logger.info('Ship24 tracker created', {
      trackerId: response.data.tracker.trackerId,
      trackingNumber,
    });

    return response.data.tracker;
  }

  /**
   * Get tracking results for a tracker
   */
  async getTrackingResults(trackerId: string): Promise<TrackingInfo | null> {
    try {
      const response = await this.request<{ data: { trackings: Ship24TrackingResult[] } }>(
        `/trackers/${trackerId}/results`
      );

      const trackings = response.data.trackings;
      if (!trackings || trackings.length === 0) {
        return null;
      }

      const tracking = trackings[0];
      if (!tracking) {
        return null;
      }

      const isDelivered = tracking.shipment?.statusMilestone === 'delivered';

      // Find delivered event time
      let deliveredAt: string | null = null;
      if (isDelivered) {
        const deliveredEvent = tracking.events.find(e =>
          e.statusMilestone === 'delivered' || e.statusCategory === 'delivered'
        );
        deliveredAt = deliveredEvent?.datetime || null;
      }

      // Map status milestone
      const statusMilestone = this.mapStatusMilestone(tracking.shipment?.statusMilestone || 'unknown');

      return {
        trackerId: tracking.trackerId,
        trackingNumber: tracking.trackingNumber,
        status: tracking.shipment?.statusCode || 'unknown',
        statusMilestone,
        isDelivered,
        deliveredAt,
        lastUpdate: tracking.events[0]?.datetime || null,
        events: tracking.events.map(e => ({
          status: e.status,
          description: e.statusCode,
          location: e.location ? `${e.location.city}, ${e.location.state} ${e.location.country}` : null,
          datetime: e.datetime,
        })),
      };
    } catch (error) {
      logger.error('Failed to get tracking results', { trackerId, error });
      return null;
    }
  }

  /**
   * Get tracking info by tracking number (creates tracker if needed)
   */
  async trackPackage(trackingNumber: string, existingTrackerId?: string): Promise<TrackingInfo | null> {
    let trackerId = existingTrackerId;

    // Create tracker if we don't have one
    if (!trackerId) {
      try {
        const tracker = await this.createTracker(trackingNumber);
        trackerId = tracker.trackerId;
      } catch (error) {
        logger.error('Failed to create tracker', { trackingNumber, error });
        return null;
      }
    }

    return this.getTrackingResults(trackerId);
  }

  /**
   * Parse a Ship24 webhook payload
   */
  parseWebhook(payload: unknown): {
    trackingNumber: string;
    trackerId: string;
    status: string;
    statusMilestone: string;
    isDelivered: boolean;
    deliveredAt: string | null;
  } | null {
    try {
      // Ship24 webhook structure
      const data = payload as { data?: { tracking?: {
        trackingNumber?: string;
        trackerId?: string;
        status?: string;
        statusCode?: string;
        statusMilestone?: string;
        datetime?: string;
      } } };

      const event = data?.data;
      if (!event) {
        logger.warn('Invalid Ship24 webhook payload - no data', { payload });
        return null;
      }

      const tracking = event.tracking;
      if (!tracking || !tracking.trackingNumber || !tracking.trackerId) {
        logger.warn('Invalid Ship24 webhook payload - no tracking', { payload });
        return null;
      }

      const isDelivered = tracking.statusMilestone === 'delivered';
      const deliveredAt = isDelivered ? (tracking.datetime || new Date().toISOString()) : null;

      return {
        trackingNumber: tracking.trackingNumber,
        trackerId: tracking.trackerId,
        status: tracking.status || tracking.statusCode || 'unknown',
        statusMilestone: tracking.statusMilestone || 'unknown',
        isDelivered,
        deliveredAt,
      };
    } catch (error) {
      logger.error('Failed to parse Ship24 webhook', { payload, error });
      return null;
    }
  }

  private mapStatusMilestone(milestone: string): TrackingInfo['statusMilestone'] {
    switch (milestone.toLowerCase()) {
      case 'pending':
        return 'pending';
      case 'info_received':
      case 'info received':
        return 'info_received';
      case 'in_transit':
      case 'in transit':
        return 'in_transit';
      case 'out_for_delivery':
      case 'out for delivery':
        return 'out_for_delivery';
      case 'delivered':
        return 'delivered';
      case 'exception':
      case 'failed_attempt':
      case 'available_for_pickup':
        return 'exception';
      default:
        return 'unknown';
    }
  }

  /**
   * Check if Ship24 is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

export const ship24Service = new Ship24Service();
