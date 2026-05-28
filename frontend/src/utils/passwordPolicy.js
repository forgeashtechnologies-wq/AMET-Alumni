const COMMON = ['password','passw0rd','123456','qwerty','letmein','admin','welcome','iloveyou'];

export function validatePassword(pw, email) {
  // Match Supabase Auth weak_password policy as closely as possible
  // while keeping a stronger local minimum length.
  if (!pw || pw.length < 12) {
    return {
      ok: false,
      message: 'Password must be at least 12 characters long and include lowercase, UPPERCASE, numbers, and symbols.',
    };
  }

  const lowers = /[a-z]/.test(pw);
  const uppers = /[A-Z]/.test(pw);
  const digits = /\d/.test(pw);
  const symbols = /[^A-Za-z0-9]/.test(pw);

  // Supabase error text:
  // "Password should contain at least one character of each: abcdef... ABCDEF... 0123456789, !@#$%^&*()_+-=[]{};':"|<>?,./`~."
  if (!lowers || !uppers || !digits || !symbols) {
    return {
      ok: false,
      message:
        "Password should contain at least one character of each: abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789, !@#$%^&*()_+-=[]{};':\"|<>?,./`~.",
    };
  }

  const local = (email || '').split('@')[0] || '';
  const lowerPw = pw.toLowerCase();
  if (local && lowerPw.includes(local.toLowerCase())) {
    return { ok: false, message: 'Avoid including your email/username.' };
  }
  if (COMMON.some((bad) => lowerPw.includes(bad))) {
    return { ok: false, message: 'Avoid common words or sequences.' };
  }
  return { ok: true };
}
