import esbuild from 'esbuild';

await esbuild
  .build({
    entryPoints: ['src/index.ts', 'src/commands/*.ts'],
    bundle: true,
    minify: true,
    platform: 'node',
    outdir: 'dist'
  })
  .catch(() => process.exit(1));
