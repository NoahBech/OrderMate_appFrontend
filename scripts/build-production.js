import { access, mkdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'

async function exists(path) {
  try {
    await access(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

export async function promoteBuild(productionDirectory) {
  const oldDirectory = `${productionDirectory}_old`
  const hadProduction = await exists(productionDirectory)

  await rm(oldDirectory, { recursive: true, force: true })
  if (hadProduction) await rename(productionDirectory, oldDirectory)

  try {
    await rename(`${productionDirectory}_new`, productionDirectory)
  } catch (error) {
    if (hadProduction) {
      try {
        await rename(oldDirectory, productionDirectory)
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          `Build swap failed. Previous build is preserved at ${oldDirectory}.`,
        )
      }
    }
    throw error
  }

  // Delete the previous version only after the new version has taken its place.
  await rm(oldDirectory, { recursive: true, force: true })
}

export async function buildProduction(productionDirectory, createBuild) {
  const newDirectory = `${productionDirectory}_new`
  const oldDirectory = `${productionDirectory}_old`
  const lockDirectory = `${productionDirectory}.build-lock`

  // Prevent simultaneous builds from overwriting each other's staging folders.
  await mkdir(lockDirectory)
  try {
    // Recover if a previous process stopped between the two directory renames.
    if (!(await exists(productionDirectory)) && await exists(oldDirectory)) {
      await rename(oldDirectory, productionDirectory)
    }

    await rm(newDirectory, { recursive: true, force: true })
    await createBuild(newDirectory)
    if (!(await stat(join(newDirectory, 'index.html'))).isFile()) {
      throw new Error('The new build does not contain an index.html file.')
    }
    await promoteBuild(productionDirectory)
  } finally {
    await rm(lockDirectory, { recursive: true, force: true })
  }
}
