// 渲染崩溃定位：对全部武器执行 renderToString
import { renderToString } from "react-dom/server"
import App from "./src/App.tsx"
import data from "./src/data/gunsmith.json" with { type: "json" }

const names = Object.keys(data.weapons)
const dead: string[] = []
for (const n of names) {
  ;(globalThis as any).location = { hash: "#" + encodeURIComponent(n) }
  try {
    renderToString(<App />)
  } catch (e: any) {
    dead.push(`${n}: ${e.message}`)
  }
}
console.log(dead.length ? dead.join("\n") : `全部 ${names.length} 把武器渲染通过`)
