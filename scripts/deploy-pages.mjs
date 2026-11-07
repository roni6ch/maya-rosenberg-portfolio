/**
 * Builds the static site for GitHub Pages and force-pushes it to the gh-pages branch.
 * Usage: npm run deploy   (uses the "origin" remote; repo name becomes the base path)
 */
import { execSync } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const run = (command, options = {}) => execSync(command, { stdio: 'inherit', ...options })
const read = (command) => execSync(command, { encoding: 'utf8' }).trim()

const remote = read('git remote get-url origin')
const repo = remote.replace(/\.git$/, '').split('/').pop()
const basePath = `/${repo}`
const outDir = '.next-build'

rmSync(outDir, { recursive: true, force: true })
run('npx next build', { env: { ...process.env, NEXT_DIST_DIR: outDir, NEXT_PUBLIC_BASE_PATH: basePath } })

const work = mkdtempSync(join(tmpdir(), 'gh-pages-'))
cpSync(outDir, work, { recursive: true })
writeFileSync(join(work, '.nojekyll'), '')

const git = (command) => run(`git ${command}`, { cwd: work })
git('init -q -b gh-pages')
git('add -A')
git('-c user.name=deploy -c user.email=deploy@users.noreply.github.com commit -q -m "Deploy"')
git(`push -f ${remote} gh-pages`)
rmSync(work, { recursive: true, force: true })
console.log(`Deployed. Site: https://${remote.split('github.com/')[1].split('/')[0]}.github.io/${repo}/`)
