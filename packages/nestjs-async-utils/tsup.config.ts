import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'core/retry/index': 'src/core/retry/index.ts',
    'core/timeout/index': 'src/core/timeout/index.ts',
    'core/concurrency/index': 'src/core/concurrency/index.ts',
    'nestjs/index': 'src/nestjs/index.ts',
  },
  format: ['esm'],
  dts: {
    resolve: true,
  },
  clean: true,
  sourcemap: true,
  minify: false,
  target: 'es2022',
  platform: 'neutral',
  external: [
    '@nestjs/common',
    '@nestjs/core',
    'reflect-metadata',
  ],
  splitting: false,
  bundle: false,
  tsupOptions: {
    incremental: false,
  },
  onSuccess: 'echo "Build completed successfully"',
});
