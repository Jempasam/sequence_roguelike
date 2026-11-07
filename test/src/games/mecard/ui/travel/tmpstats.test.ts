import { test } from "vitest"
import { scatter } from "@game/core/mecard/scatter"
import { CAVE_FLOOR, EXIT_HALT, Journey } from "@game/core/mecard"
import { Rng } from "@game/core/mecard"
const P=[{width:14,height:10},{width:48,height:40},{width:24,height:30},{width:24,height:14},{width:24,height:16}]
test("s",()=>{ for(const W of [240,320,420,560]){ const H=28+13*34+14; let t=[0,0,0,0,0],noLarge=0,ms=0; const N=40
 for(let s=1;s<=N;s++){ const j=new Journey(new Rng(s)); CAVE_FLOOR.create(1).fillMap(j); j.addExits([{} as never,{} as never], EXIT_HALT)
  const at=(r:number,a:number)=>({x:Math.round(14+a*(W-28)),y:Math.round(H-14-r*34)})
  const c=(p:{layer:number,across:number})=>at(p.layer+1,p.across); const st=at(0,.5)
  const paths=[...j.layers[0].map(p=>({from:st,to:c(p)})),...j.layers.flat().flatMap(p=>p.next.map(n=>({from:c(p),to:c(n)})))]
  const tokens=[st,...j.layers.flat().map(c)]
  const t0=performance.now(); const l=scatter(s,P,{size:{width:W,height:H},tokens,paths}); ms+=performance.now()-t0
  const n=[0,0,0,0,0]; for(const e of l)n[e.piece]++; n.forEach((v,i)=>t[i]+=v); if(!n[1])noLarge++ }
 console.log(W,"avg",t.map(v=>(v/N).toFixed(1)).join(" "),"noLarge",noLarge,"/",N,"ms",(ms/N).toFixed(1)) }},120000)
