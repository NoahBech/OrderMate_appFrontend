import assert from 'node:assert/strict'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { buildProduction, promoteBuild } from './build-production.js'

async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), 'ordermate-release-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  return join(directory, 'production')
}

async function writeBuild(directory, content) {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'index.html'), content)
}

async function absent(path) {
  await assert.rejects(access(path), { code: 'ENOENT' })
}

test('keeps the current build available until the new build finishes', async (t) => {
  const production = await setup(t)
  await writeBuild(production, 'current')
  await writeFile(join(production, 'stale.txt'), 'old asset')
  await buildProduction(production, async (staging) => {
    assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'current')
    await writeBuild(staging, 'new')
    assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'current')
  })
  assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'new')
  await absent(join(production, 'stale.txt'))
  await absent(`${production}_new`)
  await absent(`${production}_old`)
  await absent(`${production}.build-lock`)
})

test('preserves production and releases the lock when compilation fails', async (t) => {
  const production = await setup(t)
  await writeBuild(production, 'current')
  await assert.rejects(buildProduction(production, async (staging) => {
    await writeBuild(staging, 'partial')
    throw new Error('Compilation failed')
  }), /Compilation failed/)
  assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'current')
  await absent(`${production}.build-lock`)
})

test('rejects output without an index before touching production', async (t) => {
  const production = await setup(t)
  await writeBuild(production, 'current')
  await assert.rejects(buildProduction(production, (staging) => mkdir(staging)))
  assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'current')
})

test('restores the previous build if promotion fails', async (t) => {
  const production = await setup(t)
  await writeBuild(production, 'current')
  // Missing staging forces the second rename to fail after production was moved.
  await assert.rejects(promoteBuild(production), { code: 'ENOENT' })
  assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'current')
  await absent(`${production}_old`)
})

test('supports the first build without an existing production directory', async (t) => {
  const production = await setup(t)
  await buildProduction(production, (staging) => writeBuild(staging, 'first'))
  assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'first')
})

test('recovers an interrupted swap and clears stale staging before rebuilding', async (t) => {
  const production = await setup(t)
  await writeBuild(`${production}_old`, 'previous')
  await writeBuild(`${production}_new`, 'partial')
  await buildProduction(production, async (staging) => {
    assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'previous')
    await absent(staging)
    await writeBuild(staging, 'complete')
  })
  assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'complete')
})

test('blocks a concurrent build without disturbing the active build', async (t) => {
  const production = await setup(t)
  await writeBuild(production, 'current')
  await buildProduction(production, async (staging) => {
    await assert.rejects(buildProduction(production, () => {
      assert.fail('Concurrent compilation must not start')
    }), { code: 'EEXIST' })
    await access(`${production}.build-lock`)
    await writeBuild(staging, 'new')
  })
  assert.equal(await readFile(join(production, 'index.html'), 'utf8'), 'new')
})
