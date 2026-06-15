import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const defaultOutput = join(
  process.env.LOCALAPPDATA ?? process.cwd(),
  'NateOVisionBuild',
  'release',
);
const outputDir = resolve(process.env.NATE_OVISION_RELEASE_DIR ?? defaultOutput);
const runner = resolve(process.cwd(), 'node_modules', 'electron-builder', 'cli.js');

rmSync(outputDir, { force: true, recursive: true });

const builderArgs = [
  '--config',
  'electron-builder.yml',
  `--config.directories.output=${outputDir}`,
];
const result = spawnSync(process.execPath, [runner, ...builderArgs], {
  cwd: process.cwd(),
  stdio: 'inherit',
});

if (result.status !== 0) {
  if (result.error) {
    console.error(result.error);
  }
  process.exit(result.status ?? 1);
}

console.log(`\nWindows installer output: ${outputDir}`);
