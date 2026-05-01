/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // App backgrounds
        canvas:    '#F8FAFC',
        surface:   '#FFFFFF',
        // Brand — Trust & Calm
        brand: {
          DEFAULT: '#0F766E', // Teal 700
          50:      '#F0FDFA',
          100:     '#CCFBF1',
          200:     '#99F6E4',
          500:     '#14B8A6',
          600:     '#0D9488',
          700:     '#0F766E',
          800:     '#115E59',
        },
        // Status — empathetic, non-aggressive
        critical: {
          DEFAULT: '#E11D48', // Rose 600
          50:      '#FFF1F2',
          100:     '#FFE4E6',
          500:     '#F43F5E',
          600:     '#E11D48',
          700:     '#BE123C',
        },
        warning: {
          DEFAULT: '#D97706', // Amber 600
          50:      '#FFFBEB',
          100:     '#FEF3C7',
          500:     '#F59E0B',
          600:     '#D97706',
        },
        safe: {
          DEFAULT: '#059669', // Emerald 600
          50:      '#ECFDF5',
          100:     '#D1FAE5',
          500:     '#10B981',
          600:     '#059669',
        },
        // Typography
        ink: {
          900: '#0F172A', // headings
          700: '#334155',
          600: '#475569', // body
          500: '#64748B',
          400: '#94A3B8', // muted labels
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans:    ['Inter', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft:        '0 2px 8px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.03)',
        'soft-lg':   '0 12px 32px rgba(15, 23, 42, 0.08), 0 2px 6px rgba(15, 23, 42, 0.04)',
        'soft-xl':   '0 20px 48px rgba(15, 23, 42, 0.10), 0 4px 12px rgba(15, 23, 42, 0.05)',
        glow:        '0 0 0 4px rgba(15, 118, 110, 0.10)',
        'ring-brand':'0 0 0 3px rgba(15, 118, 110, 0.18)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
