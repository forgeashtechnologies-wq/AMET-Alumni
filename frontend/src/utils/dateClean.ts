export const toISODate = (v: string) =>
  /^\d{2}\/\d{2}\/\d{4}$/.test(v)
    ? `${v.slice(6,10)}-${v.slice(3,5)}-${v.slice(0,2)}`
    : v;
