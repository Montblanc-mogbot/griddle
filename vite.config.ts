/* eslint-disable no-undef */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this app from /<repo>/
  // Use process.env here because this runs in Node at build time.
  base: process.env.GITHUB_PAGES ? '/griddle/' : '/',
});
