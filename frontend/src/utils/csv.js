export function downloadCSV(filename, rows) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const lines = [headers.join(',')].concat(
    rows.map(r => headers.map(h => {
      const v = r[h] ?? '';
      const s = typeof v === 'string' ? v.replace(/"/g, '""') : String(v);
      return `"${s}"`;
    }).join(','))
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
