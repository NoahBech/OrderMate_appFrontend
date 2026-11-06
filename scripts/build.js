import { fileURLToPath } from 'node:url'
import { build } from 'vite'
import { buildProduction } from './build-production.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const productionDirectory = fileURLToPath(new URL('../../production', import.meta.url))

await buildProduction(productionDirectory, (outDir) => build({
  root,
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  build: { outDir },
}))

console.log('Production updated. Previous build removed.')
