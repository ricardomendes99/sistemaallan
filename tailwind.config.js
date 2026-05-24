/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './*.html',
    './admin/**/*.html',
    './campo/**/*.html',
    './cliente/**/*.html',
  ],
  safelist: [
    // classes geradas dinamicamente por JS (utils.js, templates inline)
    'tag-ok', 'tag-alerta', 'tag-pending', 'tag-info',
    'mc-blue', 'mc-green', 'mc-amber', 'mc-red',
    'hora-slot', 'hora-slot-header', 'hora-body', 'hora-body',
    'hora-label', 'hora-preview', 'hora-dot',
    'dot-empty', 'dot-filled', 'dot-lunch',
    'filled', 'in-lunch', 'empty', 'open',
    'perfil-admin', 'perfil-user',
    'status-ativo', 'status-inativo',
    'sig-wrap', 'has-sig',
    'aprov-ok', 'aprov-ressalvas', 'aprov-pendente',
    // cliente/ver.html: dark states adicionados dinamicamente via classList
    'dark:bg-emerald-900/20', 'dark:bg-amber-900/20',
    'dark:border-slate-600',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea6c0a',
          700: '#c2560a',
          800: '#9a3412',
          900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card':       '0 1px 3px 0 rgb(0 0 0 / .06), 0 1px 2px -1px rgb(0 0 0 / .04)',
        'card-hover': '0 4px 16px 0 rgb(0 0 0 / .10)',
        'modal':      '0 24px 64px 0 rgb(0 0 0 / .22)',
        'brand':      '0 4px 14px 0 rgb(249 115 22 / .35)',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fadeIn .2s ease-out',
        'slide-up': 'slideUp .25s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition:  '400px 0' },
        },
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
