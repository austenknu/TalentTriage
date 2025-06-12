// Jest setup file for TalentTriage frontend
import '@testing-library/jest-dom';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    reload: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  }),
}));

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: () => null,
  Pie: () => null,
  Radar: () => null,
  Line: () => null,
  Doughnut: () => null,
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ data: [], error: null }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({}),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/file.pdf' } }),
      }),
    },
  };

  return {
    createClient: jest.fn().mockReturnValue(mockSupabase),
  };
});

// Global fetch mock
global.fetch = jest.fn().mockResolvedValue({
  json: jest.fn().mockResolvedValue({}),
  ok: true,
});

// Mock window.URL.createObjectURL
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = jest.fn();
}

// Suppress console errors during tests
const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render') ||
      args[0].includes('Warning: React.createElement') ||
      args[0].includes('Warning: Each child in a list'))
  ) {
    return;
  }
  originalConsoleError(...args);
};
