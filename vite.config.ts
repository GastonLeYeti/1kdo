/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { devApi } from './server/dev-api.ts';

export default defineConfig({
  plugins: [react(), devApi()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
