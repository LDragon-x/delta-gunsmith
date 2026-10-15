import { optimize, PRESETS } from './src/lib/optimizer.ts'
import data from './src/data/gunsmith.json' with { type: 'json' }

const weaponsRaw = data.weapons
const attachments = data.attachtures ?? data.attachments
const weapons = {}
for (const [name, w] of Object.entries(weaponsRaw)) {
  weapons[name] = { ...w, slots: [...new Set(attachments.filter(a => a.weapons.includes(w.dfttk_id)).map(a => a.slot))], price: 0 }
}
let fail = 0
for (const [name, w] of Object.entries(weapons)) {
  for (const p of Object.keys(PRESETS)) {
    try {
      const r = optimize(w, attachments, PRESETS[p], null, 3)
      if (!r.length) { console.log(`空方案: ${name} ${p}`); fail++ }
    } catch (e) {
      console.log(`崩溃: ${name} [${p}] ${e.message}`)
      fail++
    }
  }
}
console.log(fail === 0 ? '全部 68 武器 x 4 预设通过' : `${fail} 个失败`)
