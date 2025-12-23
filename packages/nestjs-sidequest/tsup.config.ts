import {defineConfig} from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  minify: false,
  treeshake: true,
  target: 'es2022',
  platform: 'node',
  external: [
    // NestJS peer dependencies
    '@nestjs/common',
    '@nestjs/core',
    // RxJS peer dependency
    'rxjs',
    // Optional peer dependencies
    'nestjs-cls',
    // Node.js builtins
    'crypto',
  ],
  bundle: true,
  onSuccess: async () => {
    console.log('✅ Build completed');
  },
});
