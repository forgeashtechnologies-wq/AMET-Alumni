import { supabase } from "./supabase";

const registry = new Map();

export function getChannel(key) {
  if (registry.has(key)) return registry.get(key);
  const ch = supabase.channel(key);
  registry.set(key, ch);
  return ch;
}

export function removeChannel(key) {
  const ch = registry.get(key);
  if (!ch) return;
  supabase.removeChannel(ch);
  registry.delete(key);
}

export function resetAllChannels() {
  for (const key of Array.from(registry.keys())) removeChannel(key);
}
