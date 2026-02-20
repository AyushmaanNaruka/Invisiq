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

        // Elevated surfaces (Phase 4)
        'surface-elevated': rgb('surface-elevated'),
        'surface-glass': rgb('surface-glass'),

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
        'accent-cyan': rgb('accent-cyan'),
        'accent-blue': rgb('accent-blue'),
        'accent-purple': rgb('accent-purple'),
        'accent-amber': rgb('accent-amber'),
        'glow-primary': rgb('glow-primary'),

        // Status
        'status-success': rgb('status-success'),
        'status-warning': rgb('status-warning'),
        'status-error': rgb('status-error'),
        'status-streaming': rgb('status-streaming'),

        // Borders
        'border-subtle': rgb('border-subtle'),
        'border-active': rgb('border-active'),
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
        '2xl': '22px',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
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
        '10': '40px',
        '12': '48px',
      },
      boxShadow: {
        overlay: '0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4)',
        dropdown: '0 4px 16px rgba(0, 0, 0, 0.5)',
        tooltip: '0 2px 8px rgba(0, 0, 0, 0.4)',
        'ghost-sm': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'ghost-md': '0 4px 12px rgba(0, 0, 0, 0.35)',
        'ghost-lg': '0 8px 24px rgba(0, 0, 0, 0.45)',
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.2), 0 0 40px rgba(20, 184, 166, 0.08)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.2)',
        'focus-ring': '0 0 0 2px rgb(var(--bg-overlay)), 0 0 0 4px rgb(var(--border-focus))',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        normal: '200ms',
        slow: '350ms',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
        'scan-pulse': 'scanPulse 2s ease-in-out infinite',
        'mic-pulse': 'micPulse 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
