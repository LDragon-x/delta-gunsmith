import { useMemo, useState } from "react"
import { optimize, PRESETS, type Attachment, type BuildResult, type Weapon } from "@/lib/optimizer"
import data from "@/data/gunsmith.json"

const weaponsRaw = data.weapons as unknown as Record<string, Weapon>
const attachments = data.attachments as unknown as Attachment[]
// 槽位由配件兼容表反推（与 gunsmith.py load_data("real") 同逻辑）
const weapons: Record<string, Weapon> = {}
for (const [name, w] of Object.entries(weaponsRaw)) {
  weapons[name] = {
    ...w,
    slots: [...new Set(attachments.filter((a) => a.weapons.includes(w.dfttk_id)).map((a) => a.slot))],
    price: 0,
  }
}

const CLASS_LABEL: Record<string, string> = {
  assaultRifle: "突击步枪", battleRifle: "战斗步枪", submachineGun: "冲锋枪",
  lightMachineGun: "轻机枪", marksmanRifle: "射手步枪", sniperRifle: "狙击步枪",
  shotgun: "霰弹枪", pistol: "手枪", specialWeapon: "特殊",
}

const STAT_KEYS = ["后坐控制", "稳定", "射程", "操控", "腰射精度"]

function fmt(n: number) {
  return n.toLocaleString("zh-CN")
}

function StatBar({ label, base, built }: { label: string; base: number; built?: number }) {
  const b = built ?? base
  const up = b > base + 0.05
  const down = b < base - 0.05
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-16 shrink-0 text-slate-400">{label}</span>
      <div className="relative h-1.5 flex-1 rounded bg-white/5">
        <div className="absolute inset-y-0 left-0 rounded bg-slate-500/60" style={{ width: `${base}%` }} />
        {built !== undefined && (
          <div className={`absolute inset-y-0 left-0 rounded ${up ? "bg-emerald-400" : down ? "bg-rose-400" : "bg-slate-500/60"}`}
            style={{ width: `${Math.max(0, Math.min(100, b))}%` }} />
        )}
      </div>
      <span className={`w-12 text-right font-mono ${up ? "text-emerald-400" : down ? "text-rose-400" : "text-slate-400"}`}>
        {built !== undefined && up ? "+" : ""}{built !== undefined ? (Math.round((b - base) * 10) / 10) : Math.round(base * 10) / 10}
      </span>
    </div>
  )
}

function BuildCard({ build, weapon, rank }: { build: BuildResult; weapon: Weapon; rank: number }) {
  return (
    <div className={`rounded-lg border p-4 ${rank === 0 ? "border-amber-400/50 bg-amber-400/5" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span className={`text-sm font-bold ${rank === 0 ? "text-amber-300" : "text-slate-200"}`}>方案 {rank + 1}</span>
          <span className="font-mono text-xs text-slate-400">评分 {build.score}</span>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm text-slate-200">{fmt(build.cost)} <span className="text-[10px] text-slate-500">哈夫币</span></div>
          <div className="font-mono text-[10px] text-emerald-400">{build.eff} 分/万</div>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1">
        {build.parts.map((p) => (
          <div key={p.slot + p.name} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="shrink-0 text-slate-500">{p.slot}</span>
            <span className="truncate text-slate-300">{p.name}</span>
            <span className="shrink-0 font-mono text-slate-500">{p.price ? fmt(p.price) : "—"}</span>
          </div>
        ))}
        {build.parts.length === 0 && <div className="col-span-2 text-[11px] text-slate-500">裸枪（无配件收益）</div>}
      </div>
      <div className="space-y-1 border-t border-white/5 pt-3">
        {STAT_KEYS.filter((k) => k in weapon.base).map((k) => (
          <StatBar key={k} label={k} base={weapon.base[k]} built={build.stats[k]} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState("")
  const [cls, setCls] = useState<string>("全部")
  const [wname, setWname] = useState<string>(() => {
    const h = typeof location !== "undefined" ? decodeURIComponent(location.hash.slice(1)) : ""
    return h && weapons[h] ? h : "M7"
  })
  const [preset, setPreset] = useState<string>("压枪")
  const [budget, setBudget] = useState<string>("")

  const classes = useMemo(() => ["全部", ...new Set(Object.values(weapons).map((w) => w.class))], [])
  const list = useMemo(() => {
    return Object.entries(weapons)
      .filter(([name, w]) => (cls === "全部" || w.class === cls) && name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a[0].localeCompare(b[0], "zh"))
  }, [query, cls])

  const weapon = weapons[wname] ?? weapons["M7"]
  const budgetNum = budget.trim() === "" ? null : Math.max(0, parseInt(budget, 10) || 0)
  const builds = useMemo(
    () => optimize(weapon, attachments, PRESETS[preset], budgetNum, 3),
    [weapon, preset, budgetNum],
  )

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200">
      <header className="flex items-center justify-between border-b border-white/5 px-6 py-3">
        <div>
          <h1 className="text-lg font-bold tracking-wide text-slate-100">三角洲枪匠</h1>
          <p className="text-[10px] text-slate-500">配件优化器 · 数据 dfttk 20260911 · 物价 2026-09-24</p>
        </div>
        <div className="font-mono text-[10px] text-slate-500">68 武器 / 577 配件 / 556 条市场价</div>
      </header>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[260px_1fr_420px]">
        {/* 左：武器列表 */}
        <aside className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索武器…"
            className="mb-2 w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
          />
          <div className="mb-2 flex flex-wrap gap-1">
            {classes.map((c) => (
              <button
                key={c}
                onClick={() => setCls(c)}
                className={`rounded px-1.5 py-0.5 text-[10px] ${cls === c ? "bg-emerald-400/20 text-emerald-300" : "bg-white/5 text-slate-500 hover:text-slate-300"}`}
              >
                {CLASS_LABEL[c] ?? c}
              </button>
            ))}
          </div>
          <div className="max-h-[40vh] space-y-0.5 overflow-y-auto pr-1 lg:max-h-[70vh]">
            {list.map(([name, w]) => (
              <button
                key={name}
                onClick={() => setWname(name)}
                className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs ${wname === name ? "bg-emerald-400/15 text-emerald-300" : "text-slate-400 hover:bg-white/5"}`}
              >
                <span>{name}</span>
                <span className="text-[9px] text-slate-600">{CLASS_LABEL[w.class] ?? w.class}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* 中：武器底牌 */}
        <section className="rounded-lg border border-white/5 bg-white/[0.02] p-5">
          <div className="mb-1 flex items-baseline gap-3">
            <h2 className="text-xl font-bold text-slate-100">{wname}</h2>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{CLASS_LABEL[weapon.class] ?? weapon.class}</span>
          </div>
          <p className="mb-4 font-mono text-[10px] text-slate-600">
            {Object.entries(weapon.raw).map(([k, v]) => `${k} ${v}`).join(" · ")}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {STAT_KEYS.filter((k) => k in weapon.base).map((k) => (
              <StatBar key={k} label={k} base={weapon.base[k]} />
            ))}
          </div>
          <div className="mt-4 rounded border border-white/5 bg-black/20 p-3 text-[10px] leading-relaxed text-slate-500">
            评分为游戏内官方面板五维（射程/后坐控制/腰射精度/操控/稳定，0-100 原生）。
            配件修正 = 面板点数直接加减 + 百分比加成；配件含市场价（556/577 条）。
            伤害/射速/开镜时间等为工程原始值（dfttk 数据层）。
          </div>
        </section>

        {/* 右：预设与方案 */}
        <section className="space-y-3">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="mb-2 flex gap-1">
              {Object.keys(PRESETS).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`flex-1 rounded px-2 py-1.5 text-xs ${preset === p ? "bg-emerald-400/20 font-bold text-emerald-300" : "bg-white/5 text-slate-400 hover:text-slate-300"}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">配件预算</span>
              <input
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="不限"
                className="w-28 rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-xs outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
              />
              <span className="text-[10px] text-slate-600">哈夫币</span>
            </div>
          </div>
          {builds.map((b, i) => (
            <BuildCard key={i} build={b} weapon={weapon} rank={i} />
          ))}
        </section>
      </div>
    </div>
  )
}
