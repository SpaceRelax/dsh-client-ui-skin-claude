/** Browser regression: node scripts/check-theme-order.mjs [Chromium executable]
 * Uses an isolated temporary profile; never attaches to or restarts DSH.
 * The native fixture models DSH 0.2.1-rc.3's body/body[data-ds-dark-theme]
 * token selectors. This is a cascade test, not live GUI validation.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync, mkdtempSync, openSync, closeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'lib/client.js'), 'utf8')
const expression = source.match(/var CSS = (\[[\s\S]*?\]\.join\('\\n'\))/)?.[1]
assert.ok(expression, 'CSS array must exist')
const css = runInNewContext(expression, {}, { timeout: 1000 })
const binary = process.argv[2] || process.env.CHROMIUM_BINARY || [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find(existsSync)
assert.ok(binary && existsSync(binary), 'Pass an installed Chromium executable or set CHROMIUM_BINARY')

const native = `body {
  --dsw-alias-bg-base: #fff;
  --dsw-alias-button-info-fill: #4176e6;
  --dsw-alias-state-business-primary: #4176e6;
  --dsw-alias-label-deep-diving: #4176e6;
}
body[data-ds-dark-theme] {
  --dsw-alias-bg-base: #151517;
  --dsw-alias-button-info-fill: #7aaaff;
  --dsw-alias-state-business-primary: #7aaaff;
  --dsw-alias-label-deep-diving: #7aaaff;
}`
const fixtures = [false, true].map((nativeLast) => ({
  nativeLast,
  html: `<!doctype html><head>${(nativeLast ? [css, native] : [native, css]).map((text) => `<style>${text}</style>`).join('')}</head>
<body data-dsh-claude>
<span id="fish" style="color:var(--dsw-alias-label-deep-diving)"><svg width="14" height="14"><path id="fish-path" fill="currentColor" d="M0 0h14v14H0z"/></svg></span>
<button id="tab" style="color:var(--dsw-alias-state-business-primary)">Tab</button>
<button id="send" style="background-color:var(--dsw-alias-button-info-fill)">Send</button>
</body>`,
}))
const probe = (fixtures) => {
  window.onload = () => {
    const results = fixtures.flatMap((fixture, i) => {
      const frame = document.querySelectorAll('iframe')[i]
      const doc = frame.contentDocument
      const style = (id) => frame.contentWindow.getComputedStyle(doc.getElementById(id))
      // Repeated switching must not alter the result or require reinjection.
      return [false, true, false, true].map((dark) => {
        doc.body.toggleAttribute('data-ds-dark-theme', dark)
        return {
          nativeLast: fixture.nativeLast, dark,
          canvas: frame.contentWindow.getComputedStyle(doc.body).getPropertyValue('--dsw-alias-bg-base').trim(),
          fish: style('fish-path').fill,
          tab: style('tab').color,
          send: style('send').backgroundColor,
        }
      })
    })
    document.getElementById('result').textContent = JSON.stringify(results)
  }
  for (const fixture of fixtures) {
    const frame = document.createElement('iframe')
    frame.srcdoc = fixture.html
    document.body.append(frame)
  }
}
const dir = mkdtempSync(join(tmpdir(), 'claude-theme-order-'))
const html = `<!doctype html><meta charset="utf-8"><pre id="result">PENDING</pre><script>(${probe.toString()})(${JSON.stringify(fixtures).replaceAll('<', '\\u003c')})</script>`
writeFileSync(join(dir, 'matrix.html'), html)
const out = openSync(join(dir, 'dom.txt'), 'w')
const err = openSync(join(dir, 'browser.log'), 'w')
let child
try {
  child = spawnSync(binary, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--dump-dom', '--virtual-time-budget=1500', `--user-data-dir=${join(dir, 'profile')}`,
    pathToFileURL(join(dir, 'matrix.html')).href,
  ], { stdio: ['ignore', out, err], timeout: 30000 })
} finally {
  closeSync(out)
  closeSync(err)
}
if (child.error) throw child.error
assert.equal(child.status, 0, `Browser failed; evidence at ${dir}`)
const dom = readFileSync(join(dir, 'dom.txt'), 'utf8')
const result = dom.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1]
assert.ok(result && result !== 'PENDING', `Probe did not complete; evidence at ${dir}`)
const results = JSON.parse(result)
assert.equal(results.length, 8)
for (const row of results) {
  const label = `${row.dark ? 'dark' : 'light'}, native CSS ${row.nativeLast ? 'last' : 'first'}`
  assert.equal(row.canvas, row.dark ? '#141413' : '#faf9f5', `${label}: canvas`)
  assert.equal(row.fish, row.dark ? 'rgb(217, 119, 87)' : 'rgb(198, 105, 67)', `${label}: running fish`)
  assert.equal(row.tab, 'rgb(217, 119, 87)', `${label}: active tab`)
  assert.equal(row.send, 'rgb(217, 119, 87)', `${label}: send button`)
  console.log(`PASS ${label}: canvas / fish / tab / send`)
}
console.log(`All theme-order checks passed. Temporary evidence: ${dir}`)
