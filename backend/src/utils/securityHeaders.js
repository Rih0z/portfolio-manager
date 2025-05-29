/**
 * Security headers for API responses
 */
'use strict';

const logger = require('./logger');

/**
 * Get security headers for Lambda responses
 * @param {Object} options - Options for security headers
 * @returns {Object} Security headers
 */
const getSecurityHeaders = (options = {}) => {
  const isProd = process.env.NODE_ENV === 'production' || process.env.STAGE === 'prod';
  
  const headers = {
    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Enable XSS protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Remove server header
    'Server': 'portfolio-api',
    
    // Cache control
    'Cache-Control': options.cacheControl || 'no-store, no-cache, must-revalidate',
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
  
  // Add HSTS in production
  if (isProd) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  
  // Add Content Security Policy
  if (options.includeCSP !== false) {
    const cspDirectives = [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];
    
    headers['Content-Security-Policy'] = cspDirectives.join('; ');
  }
  
  return headers;
};

/**
 * Merge security headers with existing headers
 * @param {Object} existingHeaders - Existing headers
 * @param {Object} options - Options for security headers
 * @returns {Object} Merged headers
 */
const mergeWithSecurityHeaders = (existingHeaders = {}, options = {}) => {
  const securityHeaders = getSecurityHeaders(options);
  
  // Don't override CORS headers
  const corsHeaders = ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers'];
  
  const merged = { ...securityHeaders };
  
  // Preserve existing headers
  Object.keys(existingHeaders).forEach(key => {
    if (corsHeaders.includes(key) || !securityHeaders.hasOwnProperty(key)) {
      merged[key] = existingHeaders[key];
    }
  });
  
  return merged;
};

module.exports = {
  getSecurityHeaders,
  mergeWithSecurityHeaders
};