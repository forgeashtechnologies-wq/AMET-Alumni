// Money helpers for INR formatting/parsing

export const parseINR = (input) => {
  if (input == null) return null;
  const digits = String(input).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : null;
};

export const formatINR = (n) => {
  if (n == null) return '';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch (_) {
    return `₹${Number(n).toLocaleString('en-IN')}`;
  }
};
