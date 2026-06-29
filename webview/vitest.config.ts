import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/components/Composer.tsx',
        'src/components/MessageCard.tsx',
        'src/components/ModeSelector.tsx',
      ],
      // GAP-5 coverage gate: keep the tested webview components at >= 90%
      // lines/branches/functions/statements.
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
