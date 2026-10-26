/**
 * Static regression checks for dsh-client-ui-skin-claude (no build tooling needed).
 * Run: node scripts/check.mjs
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const client = readFileSync(join(root, 'lib/client.js'), 'utf8')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

let failures = 0
function check(name, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL'
  if (!ok) failures += 1
  console.log(`${mark}  ${name}${detail ? ' — ' + detail : ''}`)
}

// 1. No hard dependency on the removed IconChevronDownOutline14 export.
//    It may appear only inside the fallback chain (after Regular/Medium).
const fallbackChain = /IconChevronDownOutlineRegular\s*\|\|\s*_primitives\.IconChevronDownOutlineMedium\s*\|\|\s*_primitives\.IconChevronDownOutline14/
check('icon fallback chain present', fallbackChain.test(client))
check('no direct IconChevronDownOutline14 JSX usage',
  !/_primitives\.IconChevronDownOutline14\s*,\s*\{/.test(client))

// 2. No high-risk substring class selectors in the shipped CSS.
const cssBody = client.match(/var CSS = \[([\s\S]*?)\]\.join\('\\n'\)/)
check('CSS array found', !!cssBody)
if (cssBody) {
  const css = cssBody[1]
  // 2. No high-risk substring class selectors except documented CSS-module
  //    semantic suffixes: _brand (wordmark), _card/_header (edited-files card).
  const risky = (css.match(/\[class\*=[^\]]+\]/g) || []).filter((s) => !/\[class\*="_(brand|card|header)"\]/.test(s))
  check('no [class*=] selectors except _brand/_card/_header', risky.length === 0, risky.join(' '))
  // 3. Brace balance sanity for the generated stylesheet.
  const open = (css.match(/\{/g) || []).length
  const close = (css.match(/\}/g) || []).length
  check('CSS braces balanced', open === close, `${open} open / ${close} close`)
  // 4. Accessibility: the skin must NOT force global animation/transition
  //    overrides — a universal !important block caused ResizeObserver layout
  //    loops in DSH NEXT. DSH native styles handle reduced-motion themselves.
  check('no global prefers-reduced-motion override', !/prefers-reduced-motion/.test(css))
  check('no global forced-colors override', !/forced-colors/.test(css))
  check('no universal !important animation rules', !/(animation|transition)-duration:\s*[^;]*!important/.test(css))
  // 4b. Perf: no universal selectors and no body-level font shaping overrides.
  check('no universal * scrollbar selector', !/body\[data-dsh-claude\](:not\(\[data-ds-dark-theme\]\))?\s*\*\s*\{/.test(css))
  check('no universal ::-webkit-scrollbar selector', !/body\[data-dsh-claude\](:not\(\[data-ds-dark-theme\]\))?\s*::-webkit-scrollbar\s*\{/.test(css))
  check('no body font-feature-settings', !/font-feature-settings/.test(css))
  // 4c. Theme coverage: deep-diving pair, link, new-color brand, inline-code and
  //     menu header must be overridden in BOTH theme blocks; light block must
  //     carry its own shadow/interactive values so dark values never leak.
  const count = (re) => (css.match(re) || []).length
  check('label-deep-diving overridden in both themes', count(/--dsw-alias-label-deep-diving:\s*#/g) === 2)
  check('label-deep-diving-shimmer overridden in both themes', count(/--dsw-alias-label-deep-diving-shimmer:\s*#/g) === 2)
  check('alias-link overridden in both themes', count(/--dsw-alias-link:\s*#/g) === 2)
  check('brand-new-color overridden in both themes', count(/--dsw-alias-brand-primary-new-colorprimary-new-color:\s*#/g) === 2)
  check('markdown-inline-code overridden in both themes', count(/--dsw-alias-markdown-inline-code:\s*#/g) === 2)
  const lightBlock = (css.split('body[data-dsh-claude]:not([data-ds-dark-theme]) {')[1] || '').split("'}'")[0]
  const lightBody = lightBlock.slice(0, lightBlock.indexOf('}'))
  check('light block defines its own shadow-lv2', /--dsw-shadow-lv2/.test(lightBody))
  check('light block defines interactive hover/active', /--dsw-alias-interactive-bg-hover-solid/.test(lightBody) && /--dsw-alias-interactive-bg-active/.test(lightBody))
  // 4d. No universal transition rules anywhere — even "transient" ones caused
  //     multi-second style-recalc freezes on large DOMs during theme switches.
  const uniTrans = (css.match(/body\[?[^{\n]*\*\s*\{[^}]*transition[^}]*\}/g) || [])
  check('no universal transition rules at all', uniTrans.length === 0)
  // 5. A2: restrict containment to historical keyed top-level rows; the
  //    running-status sibling means :last-child does NOT protect the live tail.
  const a2 = css.match(/body\[data-dsh-claude\] \[data-conversation-scroll\] :is\(\[data-chat-flow\]:not\(\[data-step-process-content\]\), \[data-chat-flow\]:not\(\[data-step-process-content\]\) > \[data-slot="conversation\.chat\.flow"\]\) > \[data-chat-flow-key\]:not\(\[data-chat-group-key\]\):not\(\[data-chat-flow-kind="turn-process"\]\):has\(~ \[data-chat-flow-key\] ~ \[data-chat-flow-key\]\) \{[\s\S]*?\}/)
  check('A2 scoped to older keyed transcript rows, retaining two tail rows', !!a2)
  check('A2 auto visibility and remembered 240px size', !!a2 && /content-visibility: auto;/.test(a2[0]) && /contain-intrinsic-size: auto 240px;/.test(a2[0]))
  check('A2 no :last-child assumption', !/content-visibility: auto;/.test(css) || (!!a2 && !/:last-child/.test(a2[0])))
  // 6. Shimmer scoped to the running turn's native TextShimmer only.
  check('shimmer scoped to [data-chat-running] [data-shimmer]',
    /\[data-chat-running\]\s*\[data-shimmer\]/.test(css) &&
    !/\[role="status"\]\[aria-live="polite"\]/.test(css))
}

// 6. Idempotent style mount + generation ownership.
check('idempotent style reuse (getElementById before createElement)',
  /getElementById\(STYLE_ID\)/.test(client) &&
  /existingStyle \|\| document\.createElement\('style'\)/.test(client))
check('generation token stamped', /OWNER_ATTR, ownerToken/.test(client))
check('teardown honors generation', /getAttribute\(OWNER_ATTR\)\s*===\s*ownerToken/.test(client))
// 6b. Lifecycle hardening (code review findings).
check('body owner gate present (stale teardown retracts nothing)',
  /body\.dataset\.dshClaudeSkinOwner !== ownerToken\) return/.test(client))
check('no OWNER_ATTR removal in teardown (would strip newer owner)',
  !/removeAttribute\(OWNER_ATTR\)/.test(client))
check('title double-apply safe (originalTitle null guard)',
  /originalTitle !== null && document\.title === SKIN_TITLE/.test(client) &&
  /titleAlreadyOurs/.test(client))
check('settings row injection wrapped in ctx.effect',
  /ctx\.effect\(\(\) => ctx\.slots\.inject\(/.test(client))
check('chevron rendered via jsx runtime (hook-safe)',
  /jsx\(ChevronDownIcon, \{/.test(client))
check('mono font stack has no proportional CJK font',
  !/"Source Han Sans SC", ui-monospace/.test(client))

// 7. Version bumped for the compat release.
check('version is 0.3.0-next-compat', pkg.version === '0.3.0-next-compat', pkg.version)

// 8. No proprietary font binaries shipped in the npm file list.
check('fonts/ not in npm files list', !(pkg.files || []).some((f) => /^fonts/.test(f)))

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
