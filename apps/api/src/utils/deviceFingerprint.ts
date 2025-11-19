import crypto from 'crypto';
import { Request } from 'express';
import UAParser from 'ua-parser-js';

export interface DeviceInfo {
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  userAgent: string;
  fingerprint: string;
}

/**
 * Generate a device fingerprint based on user agent and client hints
 */
export function generateDeviceFingerprint(req: Request): string {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Get client hints from request body (sent from frontend)
  const screenResolution = req.body.screenResolution || '';
  const timezone = req.body.timezone || '';
  const colorDepth = req.body.colorDepth || '';

  // Combine all fingerprint components
  const fingerprintData = [
    userAgent,
    acceptLanguage,
    acceptEncoding,
    screenResolution,
    timezone,
    colorDepth,
  ].join('|');

  // Create hash
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Parse device information from user agent
 */
export function parseDeviceInfo(req: Request): DeviceInfo {
  const userAgent = req.headers['user-agent'] || '';
  const parser = new (UAParser as any)(userAgent);
  const result = parser.getResult();

  // Determine device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (result.device.type === 'mobile') {
    deviceType = 'mobile';
  } else if (result.device.type === 'tablet') {
    deviceType = 'tablet';
  }

  // Generate device name
  const browserName = result.browser.name || 'Unknown Browser';
  const osName = result.os.name || 'Unknown OS';
  const deviceName = `${browserName} on ${osName}`;

  // Generate browser info
  const browserVersion = result.browser.version || '';
  const browser = browserVersion ? `${browserName} ${browserVersion}` : browserName;

  // Generate fingerprint
  const fingerprint = generateDeviceFingerprint(req);

  return {
    deviceName,
    deviceType,
    browser,
    userAgent,
    fingerprint,
  };
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string {
  // Check for proxy headers first
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  // Fallback to socket address
  return req.socket.remoteAddress || '0.0.0.0';
}

/**
 * Get device type icon name
 */
export function getDeviceTypeIcon(deviceType: string): string {
  switch (deviceType.toLowerCase()) {
    case 'mobile':
      return 'smartphone';
    case 'tablet':
      return 'tablet';
    case 'desktop':
    default:
      return 'monitor';
  }
}
