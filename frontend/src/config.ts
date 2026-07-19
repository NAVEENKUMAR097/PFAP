/**
 * Frontend configuration.
 * 
 * Environment-based configuration for API URLs and other settings.
 */

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'PFAP';

export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';

export const UNREACHABLE_MESSAGE = `Could not reach the backend. Is it running on ${API_URL}?`;
