import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('vite config', () => {
  it('uses relative assets so packaged Electron file URLs can load the app', () => {
    const config = readFileSync(resolve('vite.config.ts'), 'utf8');

    expect(config).toContain("base: './'");
  });
});
