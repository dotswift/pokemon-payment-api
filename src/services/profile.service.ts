import { getSupabaseClient } from './supabase/client';
import { logger } from '../utils/logger';

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

class ProfileService {
  /**
   * Get user's shipping address
   */
  async getShippingAddress(userId: string): Promise<ShippingAddress | null> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('shipping_address')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error getting shipping address', { error, userId });
      throw error;
    }

    return data?.shipping_address || null;
  }

  /**
   * Check if user has a valid shipping address
   */
  async hasShippingAddress(userId: string): Promise<boolean> {
    const address = await this.getShippingAddress(userId);

    if (!address) return false;

    // Check required fields
    return !!(
      address.street &&
      address.city &&
      address.state &&
      address.zip &&
      address.country
    );
  }

  /**
   * Save/update user's shipping address
   */
  async saveShippingAddress(userId: string, address: ShippingAddress): Promise<ShippingAddress> {
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase is not configured');
    }

    // Validate required fields
    if (!address.street || !address.city || !address.state || !address.zip || !address.country) {
      throw new Error('Missing required address fields: street, city, state, zip, and country are required');
    }

    // Normalize the address
    const normalizedAddress: ShippingAddress = {
      street: address.street.trim(),
      city: address.city.trim(),
      state: address.state.trim().toUpperCase(),
      zip: address.zip.trim(),
      country: address.country.trim().toUpperCase(),
      phone: address.phone?.trim() || undefined,
    };

    const { error } = await supabase
      .from('profiles')
      .update({ shipping_address: normalizedAddress })
      .eq('id', userId);

    if (error) {
      logger.error('Error saving shipping address', { error, userId });
      throw error;
    }

    logger.info('Shipping address saved', { userId });

    return normalizedAddress;
  }
}

export const profileService = new ProfileService();
