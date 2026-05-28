export function sanitizeFilename(name) {
  const idx = name.lastIndexOf('.');
  const ext = idx > -1 ? name.slice(idx).toLowerCase() : '';
  const base = idx > -1 ? name.slice(0, idx) : name;
  const safeBase = (base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)) || 'file';
  return `${safeBase}${ext || '.pdf'}`;
}

// Sanitize to a safe object key for Supabase Storage (allowing word chars, dot, dash)
export const safeObjectName = (orig) => {
  const base = (orig || 'resume.pdf')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  return (base || 'resume.pdf').slice(0, 80);
};
