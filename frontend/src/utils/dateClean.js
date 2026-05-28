export const toISODate = (v) =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(String(v))
    ? `${String(v).slice(6,10)}-${String(v).slice(3,5)}-${String(v).slice(0,2)}`
    : String(v || '');
