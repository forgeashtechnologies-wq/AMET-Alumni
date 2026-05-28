// Keep only duplicate-detection; social link values themselves are now free-text.
export function findDuplicateProvider(links) {
  if (!links) return null;
  const entries = Object.entries(links).filter(([_, v]) => !!v);
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      if (String(entries[i][1]).trim().toLowerCase() === String(entries[j][1]).trim().toLowerCase()) {
        return { duplicate: true, fields: [entries[i][0], entries[j][0]] };
      }
    }
  }
  return null;
}
