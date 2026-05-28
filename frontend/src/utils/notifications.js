// Single source of truth for recipient ID field used in queries
export const NOTIF_ID_FIELD = 'recipient_id';

export const notifScopeFilter = (userId) => `${NOTIF_ID_FIELD}.eq.${userId}`;

// Type → icon mapping limited to allowed types only
export const NOTIF_ICON = {
  profile: '👤',
  connections: '🤝',
  messaging: '✉️',
  events: '📅',
  jobs: '💼',
  chat: '💬',
};

// Basic label helper (optional)
export const typeLabel = (t) => ({
  profile: 'Profile',
  connections: 'Connections',
  messaging: 'Messages',
  events: 'Events',
  jobs: 'Jobs',
  chat: 'Chat',
}[t] || 'Other');
