// Assertion tests for the beam-search attachment optimizer.
// Run: node tests/optimizer.test.mjs  (requires Node >= 22.18 for .ts type stripping)
import { optimize, PRESETS } from "../src/lib/optimizer.ts"
import data from "../src/data/gunsmith.json" with { type: "json" }

const weaponsRaw = data.weapons
const attachments = data.attachments
const weapons = {}
for (const [name, w] of Object.entries(weaponsRaw)) {
  weapons[name] = {
    ...w,
    slots: [...new Set(attachments.filter((a) => a.weapons.includes(w.dfttk_id)).map((a) => a.slot))],
    price: 0,
  }
}

let passed = 0
let failed = 0
function check(label, cond) {
  if (cond) { passed++; }
  else { failed++; console.error(`FAIL: ${label}`) }
}

const M7 = weapons["M7"]
check("M7 exists in dataset", !!M7)
check("M7 has slots inferred from compatibility table", M7.slots.length > 0)

// 1. Budget constraint: no build may exceed the given budget
{
  const budget = 100000
  const builds = optimize(M7, attachments, PRESETS["压枪"], budget, 3)
  check("budget: returns results", builds.length > 0)
  check("budget: all builds within budget", builds.every((b) => b.cost <= budget))
}

// 2. Zero budget: only zero-cost parts (unpriced attachments are treated as 0 cost)
{
  const builds = optimize(M7, attachments, PRESETS["均衡"], 0, 3)
  check("zero-budget: returns results", builds.length > 0)
  check("zero-budget: all builds cost 0", builds.every((b) => b.cost === 0))
  check("zero-budget: only free/unpriced parts used", builds.every((b) => b.parts.every((p) => p.price === 0)))
}

// 3. Score monotonicity: best build scores no worse than the bare gun
{
  const weights = PRESETS["压枪"]
  const base = Object.entries(weights).reduce((acc, [k, w]) => acc + (M7.base[k] ?? 0) * w, 0)
  const builds = optimize(M7, attachments, weights, null, 3)
  check("monotonic: best build >= bare-gun score", builds[0].score >= base - 1e-6)
}

// 4. Dedup: every recommended build is a distinct part combination
{
  const builds = optimize(M7, attachments, PRESETS["机动"], null, 3)
  const keys = builds.map((b) => b.parts.map((p) => p.name).join("|"))
  check("dedup: distinct part combinations", new Set(keys).size === keys.length)
}

// 5. Preset goal: recoil-control preset should raise 后坐控制 on the top build
{
  const builds = optimize(M7, attachments, PRESETS["压枪"], null, 3)
  check("preset: top build improves 后坐控制", builds[0].stats["后坐控制"] > M7.base["后坐控制"])
}

// 6. Sanity across a sample of weapons: no crash, non-empty, stats present
{
  const sample = ["M4A1", "AKM", "SR-25", "MP5", "AWM"].filter((n) => weapons[n])
  let ok = true
  for (const name of sample) {
    for (const preset of Object.keys(PRESETS)) {
      const r = optimize(weapons[name], attachments, PRESETS[preset], null, 3)
      if (!r.length) ok = false
      if (!r.every((b) => typeof b.score === "number" && b.stats)) ok = false
    }
  }
  check(`cross-weapon sample: ${sample.length} weapons x ${Object.keys(PRESETS).length} presets all produce builds`, ok)
}

console.log(`${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)
