/**
 * Device ID Utility
 *
 * გენერირებს და ინახავს უნიკალურ device ID-ს localStorage-ში.
 * ეს ID გამოიყენება მოწყობილობის იდენტიფიცირებისთვის login-ისას.
 */

const DEVICE_ID_KEY = 'device_id';

/**
 * გენერირებს UUID v4
 */
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * წაიკითხავს ან შექმნის device ID-ს
 * @returns device ID string
 */
export function getDeviceId(): string {
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    // Server-side or no localStorage - generate temporary ID
    return generateUUID();
  }

  try {
    // Try to get existing device ID
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
      // Generate new device ID
      deviceId = generateUUID();
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    // localStorage might be disabled (private browsing, etc.)
    console.warn('Could not access localStorage for device ID:', error);
    return generateUUID();
  }
}

/**
 * წაშლის device ID-ს (გამოიყენება logout-ისას თუ საჭიროა)
 */
export function clearDeviceId(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(DEVICE_ID_KEY);
    } catch (error) {
      console.warn('Could not clear device ID:', error);
    }
  }
}
