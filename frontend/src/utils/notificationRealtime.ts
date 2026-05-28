import {
  RealtimeChannel,
  type RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { supabase } from './supabase';
import logger from './logger';

type Listener = (payload?: any) => void;

let channel: RealtimeChannel | null = null;
let currentUserId: string | null = null;
const listeners = new Set<Listener>();

function cleanupChannel() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  currentUserId = null;
}

function ensureChannel(userId: string) {
  if (channel && currentUserId === userId) return;
  cleanupChannel();
  currentUserId = userId;
  channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        listeners.forEach((cb) => {
          try {
            cb(payload);
          } catch (err) {
            logger.error('Notification listener error', err);
          }
        });
      }
    )
    .subscribe((status: string) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        logger.warn('Realtime channel error, resetting notification subscription');
        cleanupChannel();
      }
    });
}

export function subscribeToNotifications(userId: string | undefined, cb: Listener) {
  if (!userId) return () => undefined;
  listeners.add(cb);
  ensureChannel(userId);
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) {
      cleanupChannel();
    }
  };
}
