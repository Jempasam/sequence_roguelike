import { random } from "./shapes.js"

/**
 * An image turned into a picture document: shrunk to a pixel-art size, its colours reduced to at
 * most four materials (k-means), its brightness read as relief.
 *
 * The materials come sorted from the darkest to the brightest.
 *
 * Meant for organic or irregular things that elementary shapes render badly — a carcass, a plant.
 * The result is a starting point: its palette and its depth are retouched by hand afterwards.
 *
 * @param {{width: number, height: number, rgba: Uint8Array}} image
 * @param {{width?: number, materials?: number, key?: [number,number,number]|null, tolerance?: number,
 *          depth?: [number, number], seed?: number}} options
 *   width: of the picture, the height following the ratio; key: a background colour turned empty,
 *   tolerance its distance (0..255); depth: [dark, bright] the relief brightness maps to
 */
export function importImage(image, options = {}){
    const width = options.width ?? 32
    const height = Math.max(1, Math.round(image.height * width / image.width))
    const count = Math.max(1, Math.min(4, options.materials ?? 4))
    const [dark, bright] = options.depth ?? [3, 8]
    const tolerance = options.tolerance ?? 40

    // Box-average each target pixel; a pixel more than half transparent (or keyed out) is empty.
    /** @type {([number,number,number]|null)[]} */
    const cells = []
    for(let y = 0; y < height; y++){
        for(let x = 0; x < width; x++){
            const x0 = Math.floor(x * image.width / width), x1 = Math.max(x0 + 1, Math.floor((x + 1) * image.width / width))
            const y0 = Math.floor(y * image.height / height), y1 = Math.max(y0 + 1, Math.floor((y + 1) * image.height / height))
            let r = 0, g = 0, b = 0, opaque = 0, total = 0
            for(let sy = y0; sy < y1; sy++){
                for(let sx = x0; sx < x1; sx++){
                    const i = (sx + sy * image.width) * 4
                    total++
                    const pr = image.rgba[i], pg = image.rgba[i + 1], pb = image.rgba[i + 2]
                    if(image.rgba[i + 3] < 128) continue
                    if(options.key && Math.hypot(pr - options.key[0], pg - options.key[1], pb - options.key[2]) <= tolerance) continue
                    r += pr; g += pg; b += pb; opaque++
                }
            }
            cells.push(opaque * 2 < total ? null : [r / opaque, g / opaque, b / opaque])
        }
    }

    // k-means on the opaque cells, seeded from spread-out samples.
    const colors = /** @type {[number,number,number][]} */ (cells.filter(Boolean))
    if(colors.length === 0) throw new Error("the image is empty once its background is removed")
    const rnd = random(options.seed ?? 1)
    const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b))
    let centres = Array.from({length: count}, (_, k) => [...sorted[Math.floor((k + 0.5) * sorted.length / count)]])
    /** @type {number[]} */ let assignment = []
    for(let round = 0; round < 20; round++){
        assignment = colors.map(color => nearest(color, centres))
        const sums = centres.map(() => [0, 0, 0, 0])
        colors.forEach((color, i) => {
            const s = sums[assignment[i]]
            s[0] += color[0]; s[1] += color[1]; s[2] += color[2]; s[3]++
        })
        centres = sums.map((s, k) => s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : [...colors[Math.floor(rnd() * colors.length)]])
    }

    // Materials from the darkest to the brightest, so a palette can be swapped by hand predictably.
    const order = centres.map((c, k) => k).sort((a, b) => luminance(centres[a]) - luminance(centres[b]))
    const rank = order.map((_, k) => order.indexOf(k))
    centres = order.map(k => centres[k])
    assignment = assignment.map(k => rank[k])

    const lums = colors.map(luminance)
    const low = Math.min(...lums), high = Math.max(...lums)
    const materials = [], depth = []
    let next = 0
    for(let y = 0; y < height; y++){
        let mRow = "", dRow = ""
        for(let x = 0; x < width; x++){
            const cell = cells[x + y * width]
            if(!cell){ mRow += "."; dRow += "."; continue }
            mRow += String(assignment[next++])
            const t = high > low ? (luminance(cell) - low) / (high - low) : 0.5
            dRow += "0123456789a"[Math.round(dark + (bright - dark) * t)]
        }
        materials.push(mRow)
        depth.push(dRow)
    }
    const hex = (/** @type {number[]} */ c) => "#" + c.map(v => Math.round(v).toString(16).padStart(2, "0")).join("")
    return {
        size: [width, height],
        palette: centres.map(hex),
        pixels: {materials, depth},
        render: "smooth_complete",
    }
}

/** @param {number[]} c */
function luminance(c){
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}

/** @param {number[]} color @param {number[][]} centres */
function nearest(color, centres){
    let best = 0, distance = Infinity
    centres.forEach((centre, k) => {
        const d = (color[0] - centre[0]) ** 2 + (color[1] - centre[1]) ** 2 + (color[2] - centre[2]) ** 2
        if(d < distance){ distance = d; best = k }
    })
    return best
}
