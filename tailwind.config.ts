import type { Config } from 'tailwindcss';

// Helper to create rgb() with Tailwind <alpha-value> support
const rgb = (name: string): string => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./src/renderer/**/*.{tsx,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background layers
        'bg-overlay': rgb('bg-overlay'),
        'bg-chat': rgb('bg-chat'),
        'bg-header': rgb('bg-header'),
        'bg-input': rgb('bg-input'),
        'bg-code': rgb('bg-code'),
        'bg-hover': rgb('bg-hover'),

        // Message bubbles
        'bubble-user': rgb('bubble-user'),
        'bubble-ai': rgb('bubble-ai'),
        'bubble-system': rgb('bubble-system'),

        // Text
        'text-primary': rgb('text-primary'),
        'text-secondary': rgb('text-secondary'),
        'text-placeholder': rgb('text-placeholder'),
        'text-code': rgb('text-code'),

        // Accents
        'accent-primary': rgb('accent-primary'),
        'accent-blue': rgb('accent-blue'),
        'accent-purple': rgb('accent-purple'),

        // Status
        'status-success': rgb('status-success'),
        'status-warning': rgb('status-warning'),
        'status-error': rgb('status-error'),
        'status-streaming': rgb('status-streaming'),

        // Borders
        'border-subtle': rgb('border-subtle'),
        'border-focus': rgb('border-focus'),
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
