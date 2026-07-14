// Build the SDK into a single self-running IIFE bundle plus its CSS.
//
//   dist/r2ware.min.js      — minified IIFE, self-initializes on load
//   dist/r2ware.min.js.map  — sourcemap
//   dist/r2ware.min.css     — minified, scoped (r2-*) styles
//
// The CSS file is emitted automatically from the `import './styles.css'`
// in src/index.js. No framework runtime is bundled — the output is
// dependency-free vanilla JS.
import * as esbuild from 'esbuild'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
)

await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  target: ['es2019'],
  outfile: 'dist/r2ware.min.js',
  define: {
    __SDK_VERSION__: JSON.stringify(pkg.version),
  },
  banner: {
    js: `/*! @r2ware/sdk v${pkg.version} | MIT | https://github.com/r2waredev/sdk */`,
  },
  legalComments: 'none',
})

console.log(`built @r2ware/sdk v${pkg.version} -> dist/r2ware.min.{js,css}`)
