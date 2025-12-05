import { defineConfig } from 'tsup';
import { glob } from 'glob';

export default defineConfig({
  entry: glob.sync('src/**/*.ts'),
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  target: 'es2022',
  platform: 'node',
  external: [
    // NestJS peer dependencies
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/platform-express',
    '@nestjs/platform-fastify',
    // RxJS peer dependency
    'rxjs',
    // Node.js builtins
    'node:async_hooks',
    'node:crypto',
    'node:perf_hooks',
  ],
  bundle: false,
  onSuccess: async () => {
    console.log('✅ Build completed');
  },
});