import { mapProfileForUI, validateSocialLinks } from './mapProfileForUI';

describe('mapProfileForUI', () => {
  test('maps basic fields and builds educationSummary', () => {
    const row = {
      id: 'u1',
      first_name: 'Asha',
      last_name: 'Verma',
      email: 'asha@example.com',
      phone: '+91-90000-11111',
      degree: 'B.E.',
      department: 'Marine Engineering',
      graduation_year: 2020,
      current_position: 'Engineer',
      company_name: 'OceanCo',
      location: 'Chennai, India',
      created_at: '2024-01-01T00:00:00Z',
      social_links: {
        linkedin: 'https://www.linkedin.com/in/asha-verma',
        github: 'https://github.com/ashaverma'
      },
      skills: ['Naval Architecture', 'Leadership'],
      achievements: [{ title: 'Employee of the Month', description: 'June 2024' }]
    };

    const ui = mapProfileForUI(row);
    expect(ui).toBeTruthy();
    expect(ui.name).toBe('Asha Verma');
    expect(ui.company).toBe('OceanCo');
    expect(ui.currentPosition).toBe('Engineer');
    expect(ui.degree).toBe('B.E.');
    expect(ui.department).toBe('Marine Engineering');
    expect(ui.graduationYear).toBe(2020);
    expect(ui.educationSummary).toBe('B.E. Marine Engineering (2020)');
    expect(ui.socialLinks.linkedin).toBe('https://linkedin.com/in/asha-verma');
    expect(ui.socialLinks.github).toBe('https://github.com/ashaverma');
  });

  test('handles missing values and validates social links gracefully', () => {
    const row = {
      id: 'u2',
      email: 'no-name@example.com',
      social_links: {
        website: 'http://example.com',
        twitter: 'https://x.com/somehandle',
        bad: 'not-a-url'
      }
    };
    const ui = mapProfileForUI(row);
    expect(ui.name).toBeTruthy();
    expect(ui.socialLinks.website).toBe('http://example.com');
    expect(ui.socialLinks.twitter).toBe('https://x.com/somehandle');
    expect(ui.socialLinks.bad).toBeUndefined();
  });
});

describe('validateSocialLinks', () => {
  test('normalizes linkedin www to non-www', () => {
    const out = validateSocialLinks({ linkedin: 'https://www.linkedin.com/in/someone' });
    expect(out.linkedin).toBe('https://linkedin.com/in/someone');
  });
});
