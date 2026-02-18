import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/renderer/**/*.{tsx,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background layers
        'bg-overlay': '#1a1a2e',
        'bg-chat': '#16213e',
        'bg-header': '#1e1e36',
        'bg-input': '#252547',
        'bg-code': '#0d1117',
        'bg-hover': '#2a2a4a',

        // Message bubbles
        'bubble-user': '#2E75B6',
        'bubble-ai': '#2d2d44',
        'bubble-system': '#1a3a2a',

        // Text
        'text-primary': '#E8E8E8',
        'text-secondary': '#8B8B9E',
        'text-placeholder': '#5a5a7a',
        'text-code': '#E6EDF3',

        // Accents
        'accent-primary': '#00B894',
        'accent-blue': '#2E75B6',
        'accent-purple': '#6C5CE7',

        // Status
        'status-success': '#00B894',
        'status-warning': '#FDCB6E',
        'status-error': '#D63031',
        'status-streaming': '#74B9FF',

        // Borders
        'border-subtle': '#2a2a4a',
        'border-focus': '#00B894',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: '11px',
        sm: '12px',
        base: '13px',
        md: '14px',
        lg: '16px',
        xl: '18px',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
      },
      boxShadow: {
        overlay: '0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)',
        dropdown: '0 4px 16px rgba(0, 0, 0, 0.4)',
        tooltip: '0 2px 8px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
