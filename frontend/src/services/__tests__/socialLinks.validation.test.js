import { validateLinkedIn, validateGitHub, validateX, validateWebsite, findDuplicateProvider } from '../socialLinks.validation';

describe('socialLinks.validation', () => {
  test('LinkedIn valid URLs', () => {
    expect(validateLinkedIn('https://www.linkedin.com/in/foo')).toBe(true);
    expect(validateLinkedIn('http://linkedin.com/in/foo')).toBe(true);
    expect(validateLinkedIn('https://linkedin.com/company/acme')).toBe(true);
  });

  test('LinkedIn invalid URLs', () => {
    expect(validateLinkedIn('https://linkedin/kannan')).toBe(false);
    expect(validateLinkedIn('https://github.com/foo')).toBe(false);
  });

  test('GitHub valid URLs', () => {
    expect(validateGitHub('https://github.com/alice')).toBe(true);
    expect(validateGitHub('http://www.github.com/alice')).toBe(true);
  });

  test('GitHub invalid URLs', () => {
    expect(validateGitHub('https://linkedin.com/in/alice')).toBe(false);
    // No scheme: UI requires http(s)
    expect(validateGitHub('github.com/alice')).toBe(false);
  });

  test('X/Twitter valid URLs', () => {
    expect(validateX('https://x.com/ashwin')).toBe(true);
    expect(validateX('https://twitter.com/ashwin')).toBe(true);
  });

  test('X/Twitter invalid URLs', () => {
    expect(validateX('https://twitter.co/ashwin')).toBe(false);
    expect(validateX('https://linkedin.com/in/ashwin')).toBe(false);
  });

  test('Website valid URLs', () => {
    expect(validateWebsite('https://ashwinai.in/')).toBe(true);
    expect(validateWebsite('http://example.org/abc')).toBe(true);
  });

  test('Website invalid URLs', () => {
    expect(validateWebsite('ashwinai.in')).toBe(false); // missing scheme
    expect(validateWebsite('javascript:alert(1)')).toBe(false);
  });

  test('Duplicate prevention', () => {
    const dup = findDuplicateProvider({ linkedin: 'https://linkedin.com/in/foo', website: 'https://linkedin.com/in/foo' });
    expect(dup && dup.duplicate).toBe(true);
    const ok = findDuplicateProvider({ linkedin: 'https://linkedin.com/in/foo', website: 'https://example.org' });
    expect(ok).toBeNull();
  });
});
