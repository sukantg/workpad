// Polyfills for browser compatibility
// This file must be imported first to ensure Buffer is available globally

import { Buffer } from 'buffer';

// Make Buffer available globally for all modules
if (typeof window !== 'undefined') {
  (window as any).Buffer = Buffer;
  (globalThis as any).Buffer = Buffer;
}

// Also set it on global for Node.js compatibility
if (typeof global !== 'undefined') {
  (global as any).Buffer = Buffer;
}

export { Buffer };
