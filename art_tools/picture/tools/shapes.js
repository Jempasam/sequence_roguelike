/**
 * Build a picture out of elementary shapes: boxes, ellipses, polygons and lines, laid one over the
 * other, each bringing its material **and its relief** — a flat face, a bevelled edge, a cylinder
 * bulging along an axis, a dome. That is what makes a cupboard or a table read as a volume without
 * `auto_depth`, which only sees a silhouette and rounds everything alike.
 *
 * A shape is filled with one material, or with a pattern (tiles, planks, noise) that picks among
 * several and carves its own relief on top of the shape's: grout in hollow, boards a notch apart.
 *
 *   {
 *     "size": [48, 32], "seed": 1,
 *     "palette": ["#7a4a2a", "#3a2416", "#b0b0b8"],
 *     "shapes": [
 *       {"box": [4, 4, 40, 26], "fill": {"pattern": "planks", "width": 5, "materials": [0, 1]},
 *        "depth": [3, 5], "relief": "bevel", "bevel": 2},
 *       {"ellipse": [22, 14, 3, 3], "material": 2, "depth": [6, 8], "relief": "dome"},
 *       {"picture": "ham.pic.json", "at": [30, 2], "materials": [2, 0, 1], "depth": 1, "flip": true}
 *     ],
 *
 * A `picture` shape lays another document in (an imported image, a drawn object, another shapes
 * document), its path relative to this one: its materials remapped by `materials` (its index →
 * ours, null to drop), its own relief raised by `depth`.
 *     "filters": [], "render": {"preset": "smooth_complete", "light": 120}
 *   }
 *
 * The result is an ordinary `.pic.json` document — same palette, filters and render — so it can be
 * rendered at once or written out and retouched by hand.
 */

import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

/** @typedef {{m: number|null, d: number}} Cell  a material index (null: let what is below show) and a depth offset */

/** A small seeded generator, so a pattern is the same at every render. @param {number} seed */
export function random(seed){
    let state = (seed >>> 0) || 0x9e3779b9
    return () => {
        state = (state + 0x6d2b79f5) >>> 0
        let t = state
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/** @param {string} where @param {string} message @returns {never} */
function fail(where, message){
    throw new Error(`${where}: ${message}`)
}

//// Patterns ////

/**
 * A pattern: given its options, the size of the shape and a generator, a function of the local
 * pixel giving the index into its `materials` and a depth offset.
 * @type {{[name: string]: {describe: string, make: (o: any, w: number, h: number, rnd: () => number) => (x: number, y: number) => {i: number, d: number}}}}
 */
export const PATTERNS = {
    tiles: {
        describe: "a grid of tiles and grout: cell [w,h], grout (px), offset (row stagger, 0.5 = bricks), groutDepth; materials [tile, grout, odd tile?]",
        make(o, _w, _h, rnd){
            const [cw, ch] = o.cell ?? [6, 6]
            const grout = o.grout ?? 1
            const offset = o.offset ?? 0
            const groutDepth = o.groutDepth ?? -1
            const odd = o.odd ?? 0
            const oddCells = new Map()
            return (x, y) => {
                const row = Math.floor(y / ch)
                const shifted = x + Math.round(row * offset * cw)
                const col = Math.floor(shifted / cw)
                if(shifted - col*cw < grout || y - row*ch < grout) return {i: 1, d: groutDepth}
                const key = `${row},${col}`
                if(!oddCells.has(key)) oddCells.set(key, rnd() < odd)
                return {i: oddCells.get(key) ? 2 : 0, d: 0}
            }
        },
    },
    planks: {
        describe: "boards: width (px), axis (\"x\" boards run horizontally, \"y\" vertically), joint (px between boards, 0 none), seams (chance of a cross joint per board); materials [wood, joint, odd board?], odd (chance), jointDepth",
        make(o, w, h, rnd){
            const width = o.width ?? 4
            const along = o.axis === "y"
            const joint = o.joint ?? 1
            const jointDepth = o.jointDepth ?? -1
            const count = Math.ceil((along ? w : h) / width) + 1
            const length = along ? h : w
            const boards = Array.from({length: count}, () => ({
                odd: rnd() < (o.odd ?? 0),
                seam: rnd() < (o.seams ?? 0.5) ? Math.floor(rnd() * length) : -1,
                step: rnd() < 0.5 ? 0 : (rnd() < 0.5 ? 1 : -1),
            }))
            return (x, y) => {
                const across = along ? x : y
                const lengthwise = along ? y : x
                const index = Math.floor(across / width)
                const board = boards[index]
                if(across - index*width < joint) return {i: 1, d: jointDepth}
                if(lengthwise === board.seam) return {i: 1, d: jointDepth}
                return {i: board.odd ? 2 : 0, d: board.step * (o.unevenness ?? 0)}
            }
        },
    },
    noise: {
        describe: "blobs over a base: density (share of the area covered), radius (px, 0 = single pixels), materials [base, blob, blob2?], bump (depth offset of the blobs); a null material lets what is below show",
        make(o, w, h, rnd){
            const radius = o.radius ?? 0
            const density = o.density ?? 0.1
            const kinds = (o.materials ?? [0, 1]).length - 1
            const grid = new Int8Array(w*h)
            const area = Math.max(1, Math.PI * Math.max(radius, 0.5) ** 2)
            const blobs = Math.round(density * w * h / area)
            for(let n = 0; n < blobs; n++){
                const cx = rnd() * w
                const cy = rnd() * h
                const r = radius * (0.5 + rnd())
                const kind = 1 + Math.floor(rnd() * kinds)
                for(let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++){
                    for(let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++){
                        if(x < 0 || y < 0 || x >= w || y >= h) continue
                        const dx = x + 0.5 - cx, dy = y + 0.5 - cy
                        if(r < 0.5 ? (Math.floor(cx) === x && Math.floor(cy) === y) : dx*dx + dy*dy <= r*r) grid[x + y*w] = kind
                    }
                }
            }
            return (x, y) => {
                const kind = grid[x + y*w]
                return {i: kind, d: kind ? (o.bump ?? 0) : 0}
            }
        },
    },
    stripes: {
        describe: "parallel bands: width (px), axis (\"x\" horizontal bands, \"y\" vertical), materials [a, b, c?] cycled, depths (one offset per band material)",
        make(o){
            const width = o.width ?? 2
            const count = (o.materials ?? [0, 1]).length
            const depths = o.depths ?? []
            return (x, y) => {
                const i = Math.floor((o.axis === "y" ? x : y) / width) % count
                return {i, d: depths[i] ?? 0}
            }
        },
    },
}

//// Geometry ////

/**
 * The pixels a shape covers, each with how central it is, 0 on its border to 1 at its heart, along
 * the shape's own relief.
 * @returns {{x: number, y: number, w: number, h: number, inside: (x: number, y: number) => boolean}}
 */
function geometry(shape, where){
    if(shape.box){
        const [x, y, w, h] = shape.box
        return {x, y, w, h, inside: () => true}
    }
    if(shape.ellipse){
        const [x, y, w, h] = shape.ellipse
        return {x, y, w, h, inside: (px, py) => {
            const u = (px + 0.5 - x) / w * 2 - 1, v = (py + 0.5 - y) / h * 2 - 1
            return u*u + v*v <= 1
        }}
    }
    if(shape.polygon){
        const points = shape.polygon
        const xs = points.map(p => p[0]), ys = points.map(p => p[1])
        const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys))
        return {x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y, inside: (px, py) => {
            const cx = px + 0.5, cy = py + 0.5
            let inside = false
            for(let i = 0, j = points.length - 1; i < points.length; j = i++){
                const [xi, yi] = points[i], [xj, yj] = points[j]
                if((yi > cy) !== (yj > cy) && cx < (xj - xi) * (cy - yi) / (yj - yi) + xi) inside = !inside
            }
            return inside
        }}
    }
    if(shape.picture){
        const [x, y] = shape.at ?? [0, 0]
        const {materials: rows} = shape.loaded.pixels
        const flip = shape.flip === true
        const w = rows[0].length
        return {x, y, w, h: rows.length, inside: (px, py) => {
            const lx = flip ? w - 1 - (px - x) : px - x
            return rows[py - y]?.[lx] !== undefined && rows[py - y][lx] !== "."
        }}
    }
    if(shape.line){
        const [x1, y1, x2, y2] = shape.line
        const half = (shape.width ?? 1) / 2
        const x = Math.floor(Math.min(x1, x2) - half), y = Math.floor(Math.min(y1, y2) - half)
        const length2 = (x2 - x1) ** 2 + (y2 - y1) ** 2
        return {x, y, w: Math.ceil(Math.max(x1, x2) + half) - x, h: Math.ceil(Math.max(y1, y2) + half) - y, inside: (px, py) => {
            const cx = px + 0.5, cy = py + 0.5
            const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((cx - x1)*(x2 - x1) + (cy - y1)*(y2 - y1)) / length2))
            return (cx - x1 - t*(x2 - x1)) ** 2 + (cy - y1 - t*(y2 - y1)) ** 2 <= half*half + 0.25
        }}
    }
    fail(where, "a shape needs one of box [x,y,w,h], ellipse [x,y,w,h], polygon [[x,y],...], line [x1,y1,x2,y2] or picture \"file.pic.json\"")
}

/**
 * How central a local pixel is for a relief, 0 at the border, 1 at the heart.
 * @returns {(u: number, v: number, inside: (x: number, y: number) => boolean, px: number, py: number) => number}
 */
function relief(shape, g, where){
    const kind = shape.relief ?? "flat"
    const across = (/** @type {number} */ t) => Math.sqrt(Math.max(0, 1 - (2*t - 1) ** 2))
    switch(kind){
        case "flat": return () => 1
        case "round-x": return u => across(u)
        case "round-y": return (_u, v) => across(v)
        case "dome": return (u, v) => Math.sqrt(Math.max(0, 1 - (2*u - 1) ** 2 - (2*v - 1) ** 2))
        case "bevel": {
            const size = shape.bevel ?? 1
            return (_u, _v, inside, px, py) => {
                for(let r = 1; r <= size; r++){
                    if(!inside(px - r, py) || !inside(px + r, py) || !inside(px, py - r) || !inside(px, py + r)
                        || px - r < g.x || px + r >= g.x + g.w || py - r < g.y || py + r >= g.y + g.h){
                        return (r - 1) / size
                    }
                }
                return 1
            }
        }
        default: fail(where, `relief "${kind}" unknown: flat, bevel, round-x, round-y or dome`)
    }
}

//// Building ////

const DEPTH_CHARS = "0123456789a"

/**
 * Turn a shapes document into a `.pic.json` document.
 * @param {any} raw the parsed `.shapes.json` (or a `.pic.json` carrying `shapes`)
 * @returns {any} a `.pic.json` document
 */
export function buildShapes(raw, base = "."){
    const [width, height] = raw.size ?? fail("size", "a shapes document needs size [width, height]")
    const material = new Int8Array(width*height).fill(-1)
    const depth = new Float32Array(width*height)
    const seed = raw.seed ?? 1

    raw.shapes.forEach((shape, index) => {
        const where = `shapes[${index}]`
        if(shape.picture){
            // Another document laid in: built first if it is made of shapes itself.
            let loaded = JSON.parse(readFileSync(resolve(base, shape.picture), "utf8"))
            if(loaded.shapes) loaded = buildShapes(loaded, dirname(resolve(base, shape.picture)))
            shape = {...shape, loaded}
        }
        const g = geometry(shape, where)
        const lift = relief(shape, g, where)
        const [edge, heart] = Array.isArray(shape.depth) ? shape.depth : [shape.depth, shape.depth]
        let pick = (/** @type {number} */ _x, /** @type {number} */ _y) => ({m: shape.material ?? 0, d: 0})
        if(shape.loaded){
            // Its own materials, remapped, and its own relief, raised by the shape's depth.
            const {materials: rows, depth: depths} = shape.loaded.pixels
            const remap = shape.materials ?? [0, 1, 2, 3]
            const raise = typeof shape.depth === "number" ? shape.depth : 0
            const w = rows[0].length
            pick = (x, y) => {
                const lx = shape.flip ? w - 1 - x : x
                const own = depths ? parseInt(depths[y][lx].replace(/a/i, "10"), 10) : 5
                return {m: remap[parseInt(rows[y][lx], 36)] ?? null, d: own + raise}
            }
        }
        if(shape.fill){
            const pattern = PATTERNS[shape.fill.pattern] ?? fail(`${where}.fill`, `pattern "${shape.fill.pattern}" unknown: ${Object.keys(PATTERNS).join(", ")}`)
            const materials = shape.fill.materials ?? [0, 1]
            const at = pattern.make(shape.fill, g.w, g.h, random(seed * 7919 + index))
            pick = (x, y) => {
                const {i, d} = at(x, y)
                return {m: materials[i] ?? null, d}
            }
        }
        for(let py = g.y; py < g.y + g.h; py++){
            for(let px = g.x; px < g.x + g.w; px++){
                if(px < 0 || py < 0 || px >= width || py >= height || !g.inside(px, py)) continue
                const cell = px + py*width
                if(shape.erase){
                    material[cell] = -1
                    continue
                }
                const {m, d} = pick(px - g.x, py - g.y)
                if(m === null) continue
                const base = shape.loaded ? 0 : edge === undefined
                    ? (material[cell] === -1 ? 5 : depth[cell])
                    : edge + (heart - edge) * lift((px + 0.5 - g.x) / g.w, (py + 0.5 - g.y) / g.h, g.inside, px, py)
                material[cell] = m
                depth[cell] = base + d
            }
        }
    })

    const materials = [], depths = []
    for(let y = 0; y < height; y++){
        let mRow = "", dRow = ""
        for(let x = 0; x < width; x++){
            const m = material[x + y*width]
            mRow += m === -1 ? "." : m.toString(36)
            dRow += m === -1 ? "." : DEPTH_CHARS[Math.max(0, Math.min(10, Math.round(depth[x + y*width])))]
        }
        materials.push(mRow)
        depths.push(dRow)
    }
    const {shapes, seed: _seed, ...rest} = raw
    return {...rest, size: [width, height], pixels: {materials, depth: depths}}
}
