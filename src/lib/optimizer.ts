// 枪匠优化器：beam search（宽度 60），与 tool/gunsmith.py 同逻辑

export interface Weapon {
  class: string
  base: Record<string, number>
  raw: Record<string, number>
  dfttk_id: string
  slots: string[]
  price: number
}

export interface Attachment {
  name: string
  slot: string
  rarity: string
  price: number | null
  mods: Record<string, number>
  mults: Record<string, number>
  weapons: string[]
}

export interface BuildResult {
  score: number
  cost: number
  eff: number
  parts: { slot: string; name: string; price: number }[]
  stats: Record<string, number>
}

export const PRESETS: Record<string, Record<string, number>> = {
  压枪: { 后坐控制: 10, 稳定: 8, 射程: 5, 操控: 3, 腰射精度: 2 },
  机动: { 操控: 10, 腰射精度: 7, 稳定: 4, 后坐控制: 3, 射程: 2 },
  腰射: { 腰射精度: 10, 操控: 7, 稳定: 5, 后坐控制: 3, 射程: 1 },
  均衡: { 后坐控制: 6, 稳定: 6, 操控: 6, 射程: 6, 腰射精度: 6 },
}

const BEAM = 60

export function optimize(
  weapon: Weapon,
  atts: Attachment[],
  weights: Record<string, number>,
  budget: number | null,
  top = 3,
): BuildResult[] {
  const bySlot = new Map<string, Attachment[]>()
  for (const s of weapon.slots) {
    bySlot.set(s, atts.filter((a) => a.slot === s && a.weapons.includes(weapon.dfttk_id)))
  }
  let beam: { sc: number; chosen: Attachment[]; stats: Record<string, number>; cost: number }[] = [
    { sc: 0, chosen: [], stats: { ...weapon.base }, cost: 0 },
  ]
  const score = (stats: Record<string, number>) =>
    Object.entries(weights).reduce((acc, [k, w]) => acc + (stats[k] ?? 0) * w, 0)

  for (const slot of weapon.slots) {
    const cand: typeof beam = []
    const options = bySlot.get(slot) ?? []
    for (const b of beam) {
      // 空槽（不装）也是一个选项
      const choices: (Attachment | null)[] = [...options, null]
      for (const a of choices) {
        const cost = b.cost + (a?.price ?? 0)
        if (budget !== null && cost > budget) continue
        const stats = { ...b.stats }
        if (a) {
          for (const [k, v] of Object.entries(a.mods)) stats[k] = (stats[k] ?? 0) + v
          for (const [k, pct] of Object.entries(a.mults ?? {})) {
            if (k in stats) stats[k] = stats[k] * (1 + pct / 100)
          }
        }
        cand.push({ sc: score(stats), chosen: a ? [...b.chosen, a] : b.chosen, stats, cost })
      }
    }
    cand.sort((x, y) => y.sc - x.sc)
    beam = cand.slice(0, BEAM)
  }

  const seen = new Set<string>()
  const out: BuildResult[] = []
  for (const b of beam) {
    const key = b.chosen.map((a) => a.name).join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      score: Math.round(b.sc * 10) / 10,
      cost: b.cost,
      eff: Math.round((b.sc / (b.cost / 10000 + 1)) * 10) / 10,
      parts: b.chosen.map((a) => ({ slot: a.slot, name: a.name, price: a.price ?? 0 })),
      stats: b.stats,
    })
    if (out.length >= top) break
  }
  return out
}
