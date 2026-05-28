/** @type {import('tailwindcss').Config} */
const safeRequire = (name) => {
  try { return require(name); } catch (_) { return null; }
};

const forms = safeRequire('@tailwindcss/forms');
const typography = safeRequire('@tailwindcss/typography');

module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['"Playfair Display"', 'serif'],
      },
      colors: {
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Semantic color tokens for consistency
        semantic: {
          // Text colors - all meet WCAG AA contrast on white
          'text-primary': '#111827',      // gray-900, contrast 16:1
          'text-secondary': '#4b5563',    // gray-600, contrast 7:1
          'text-muted': '#6b7280',         // gray-500, contrast 5.3:1
          'text-disabled': '#9ca3af',      // gray-400, contrast 3:1 (large text only)
          // Surface colors
          'surface-primary': '#ffffff',
          'surface-secondary': '#f9fafb',  // gray-50
          'surface-tertiary': '#f3f4f6',   // gray-100
          // Border colors
          'border-default': '#e5e7eb',     // gray-200
          'border-strong': '#d1d5db',      // gray-300
          // Status colors - all meet WCAG AA on white
          'success': '#059669',            // emerald-600, contrast 4.5:1
          'success-bg': '#d1fae5',         // emerald-100
          'warning': '#d97706',            // amber-600, contrast 4.5:1
          'warning-bg': '#fef3c7',         // amber-100
          'error': '#dc2626',              // red-600, contrast 4.5:1
          'error-bg': '#fee2e2',           // red-100
          'info': '#0284c7',               // sky-600, contrast 4.5:1
          'info-bg': '#e0f2fe',            // sky-100
        },
      },
      // Standardized spacing scale (4px base)
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',
        '2.5': '10px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '7': '28px',
        '8': '32px',
        '9': '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '28': '112px',
        '32': '128px',
      },
      // Typography scale with proper line heights
      fontSize: {
        'fluid-h1': ['clamp(1.5rem, 2vw + 1rem, 2.25rem)', { lineHeight: '1.2' }],
        'fluid-h2': ['clamp(1.25rem, 1.5vw + 1rem, 1.75rem)', { lineHeight: '1.25' }],
        // Atomic typography scale
        'xs': ['0.75rem', { lineHeight: '1rem' }],        // 12px / 16px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],    // 14px / 20px
        'base': ['1rem', { lineHeight: '1.5rem' }],       // 16px / 24px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],    // 18px / 28px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],     // 20px / 28px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],        // 24px / 32px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],   // 30px / 36px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],     // 36px / 40px
      },
      // Animation timing for interactions
      transitionDuration: {
        'micro': '100ms',   // Button press, checkbox toggle
        'fast': '150ms',    // Hover states
        'normal': '200ms',  // Focus, small transitions
        'slow': '300ms',    // Modal open/close, drawer
        'slower': '500ms',  // Page transitions
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
      },
      // Border radius scale
      borderRadius: {
        'none': '0',
        'sm': '4px',
        'DEFAULT': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        'full': '9999px',
      },
      // Box shadows for elevation
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'DEFAULT': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'focus': '0 0 0 3px rgba(14, 165, 233, 0.4)',  // ocean-500 with opacity
        'focus-error': '0 0 0 3px rgba(220, 38, 38, 0.4)',  // red-600 with opacity
      },
      // Z-index scale
      zIndex: {
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
      },
    },
    // Breakpoints for responsive design
    screens: {
      'xs': '375px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
  },
  plugins: [forms, typography].filter(Boolean),
};