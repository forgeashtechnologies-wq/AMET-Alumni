export async function saveEventImage({ supabase, eventId, file, oldPath }) {
  const BUCKET = 'event-images';

  const ext = (() => {
    const m = (file?.type || '').toLowerCase();
    if (m.includes('png')) return 'png';
    if (m.includes('webp')) return 'webp';
    if (m.includes('jpeg') || m.includes('jpg')) return 'jpg';
    if (m.includes('avif')) return 'avif';
    return (file?.name?.split('.').pop() || 'bin').toLowerCase();
  })();

  const objectPath = `${eventId}-${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, file, {
      upsert: true,
      contentType: file?.type || `image/${ext}`,
      cacheControl: '31536000',
    });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  const publicUrl = pub?.publicUrl;

  const { error: dbErr } = await supabase
    .from('events')
    .update({ featured_image_url: publicUrl, featured_image_path: objectPath })
    .eq('id', eventId);

  if (dbErr) {
    await supabase.storage.from(BUCKET).remove([objectPath]).catch(() => {});
    throw dbErr;
  }

  if (oldPath && oldPath !== objectPath && !oldPath.startsWith('defaults/')) {
    await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
  }

  return { publicUrl, objectPath };
}
