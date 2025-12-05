import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.d.ts',
      '**/__mocks__/**',
      '**/test/**',
      '**/*.config.*',
      '.turbo',
      'backend/**',
    ],
  },

  // Base JavaScript config
  js.configs.recommended,

  // TypeScript configuration
  ...tseslint.configs.recommended,

  {
    rules: {
      // 'any' 타입 경고
      '@typescript-eslint/no-explicit-any': 'warn',

      // 사용되지 않는 변수
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
];
