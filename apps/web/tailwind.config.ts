import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#15141C',
          900: '#1C1B26',
          800: '#262533',
          700: '#34333F',
          600: '#4A4857',
        },
        paper: {
          50: '#EFEFE9',
          100: '#E6E5DC',
          200: '#D8D6C9',
        },
        brass: {
          DEFAULT: '#B8944F',
          light: '#D3B678',
          dark: '#8F7038',
        },
        verdigris: {
          DEFAULT: '#3E7C74',
          light: '#5D9C93',
        },
        brick: {
          DEFAULT: '#B5533C',
          light: '#CC7962',
        },
        ink_text: '#EDEAE0',
        muted: '#8A8798',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
      },
      boxShadow: {
        spine: 'inset 3px 0 0 0 var(--tw-shadow-color)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
