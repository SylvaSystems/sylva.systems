/*
  PostCSS pipeline: runs during the build to turn Tailwind's directives in
  globals.css into real CSS (tailwindcss) and add vendor prefixes for older
  browsers (autoprefixer). Plumbing only - never needs editing.
*/
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
