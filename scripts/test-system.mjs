import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tests = ['src', 'supabase/tests', 'server'].flatMap(folder =>
  readdirSync(path.join(root, folder), { recursive: true })
    .filter(file => file.endsWith('.test.mjs'))
    .map(file => path.join(folder, file))
).sort()
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=2', ...tests], { cwd: root, stdio: 'inherit' })
process.exitCode = result.status ?? 1
