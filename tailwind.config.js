/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './components/**/*.{ts,tsx}',
    './assets/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#17261D',           /* deep-ink — quasi-noir verdâtre, texte & bordures */
        paper: '#F1F4F1',         /* gris-vert très pâle */
        'brand-green': '#1E7A42', /* vert ISPM — fonds pleins : header, bouton */
        'seal-cream': '#F5F1E6',  /* ivoire — badge "Prêt à analyser" */
        'trust-green': '#1E6B52', /* vert sémantique "sûr" — badges résultats */
        'alert-amber': '#B9740F',
        'danger-red': '#A63D2F',
        hairline: '#D7DFD8',
      },
      fontFamily: {
        sans: ['"Public Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(23, 38, 29, 0.06)',
        stamp: '0 1px 2px 0 rgba(23, 38, 29, 0.12), 0 0 0 1px rgba(23, 38, 29, 0.06)',
      },
    },
  },
  plugins: [],
};
