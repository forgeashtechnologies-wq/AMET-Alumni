import { supabase } from '../utils/supabase';

// Helper: get current auth user id
async function getAuthUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw error || new Error('Not authenticated');
  return data.user.id;
}

// Helper: normalize empty string to null
function isEmpty(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function sanitizePatch(patch) {
  const out = {};
  Object.entries(patch || {}).forEach(([k, v]) => {
    if (v === undefined) return;
    out[k] = v;
  });
  return out;
}

export async function getMyProfile() {
  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// Fill-only seed/upsert: never overwrite non-empty columns
export async function upsertMyProfileFillOnly(seed) {
  const userId = await getAuthUserId();
  const seedClean = sanitizePatch(seed);

  // Try to fetch existing row
  const { data: existing, error: fetchErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  if (!existing) {
    const payload = { id: userId, ...seedClean };
    const { data, error } = await supabase
      .from('profiles')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Compute fill-only updates for existing row
  const updates = {};
  Object.entries(seedClean).forEach(([k, v]) => {
    if (isEmpty(existing[k]) && !isEmpty(v)) {
      updates[k] = v;
    }
  });

  if (Object.keys(updates).length === 0) return existing;

  updates.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMyProfile(patch) {
  const userId = await getAuthUserId();
  const updates = sanitizePatch({ ...patch, updated_at: new Date().toISOString() });
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
