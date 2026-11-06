import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const developmentOrigin = 'https://dev.ordermate.com'
const productionOrigin = 'https://ordermate.com'
const decoder = new TextDecoder('utf-8', { fatal: true })

export function productionUrls(text) {
  return text.replaceAll(developmentOrigin, productionOrigin)
}

// Also process copied public files, which bypass Vite's module transforms.
// Decode strictly and skip binary files to preserve images, fonts and archives.
export async function rewriteOutputUrls(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await rewriteOutputUrls(path)
    } else if (entry.isFile()) {
      const bytes = await readFile(path)
      if (!bytes.includes(Buffer.from(developmentOrigin)) || bytes.includes(0)) continue

      let original
      try {
        original = decoder.decode(bytes)
      } catch {
        continue
      }
      await writeFile(path, productionUrls(original))
    }
  }
}

export function productionBuildUrls() {
  let outputDirectory

  return {
    name: 'ordermate-production-urls',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) {
      outputDirectory = config.build.outDir
    },
    transform(code) {
      if (!code.includes(developmentOrigin)) return null
      return { code: productionUrls(code), map: null }
    },
    // Includes URLs injected by Vite environment variables or other plugins.
    renderChunk(code) {
      if (!code.includes(developmentOrigin)) return null
      return { code: productionUrls(code), map: null }
    },
    transformIndexHtml: {
      order: 'post',
      handler: productionUrls,
    },
    async writeBundle() {
      await rewriteOutputUrls(outputDirectory)
    },
  }
}
