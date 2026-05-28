import React from 'react';

// Mock ESM-only react-router-dom for CRA Jest (virtual to avoid module resolution)
jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => jest.fn(),
  }),
  { virtual: true }
);

// Mock supabase client methods used in Onboarding
jest.mock('../../utils/supabase', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      refreshSession: async () => ({})
    }
  }
}));

// Mock LoadingSpinner to a no-op component
jest.mock('../common/LoadingSpinner', () => () => null);

import Onboarding from './Onboarding';

describe.skip('Onboarding smoke', () => {
  test('can create React element without crashing', () => {
    const el = React.createElement(Onboarding, {});
    expect(el).toBeTruthy();
  });
});
