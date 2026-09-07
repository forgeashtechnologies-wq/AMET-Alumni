// Bridge: re-export everything from the TypeScript implementation.
// This ensures extensionless imports (which resolve to .js before .ts in CRA)
// get the complete API including the full deriveNotificationLink.
export * from './notifications.ts';
