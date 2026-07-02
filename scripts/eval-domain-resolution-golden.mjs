/**
 * Run domain-resolution golden eval (delegates to API script).
 *
 * Usage:
 *   node scripts/eval-domain-resolution-golden.mjs [--no-llm]
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const goldenCsv = join(
  __dirname,
  '../src/data/crawler/auto-search-golden-2025.sample.csv'
)
const apiScript = join(
  __dirname,
  '../../../API/scripts/eval-domain-resolution-golden.mjs'
)
const apiRoot = join(__dirname, '../../../API')

const extraArgs = process.argv.slice(2)
const result = spawnSync(
  'npx',
  ['tsx', apiScript, goldenCsv, ...extraArgs],
  { stdio: 'inherit', cwd: apiRoot, shell: true }
)

process.exit(result.status ?? 1)
