// Compiles the animation of a transition, written as tracks of relative steps with an optional global track, into
// the names the engine reads for its layers (`<name> x;y;z;a … m …`, see core/src/engine/ui/widget/TransitionScript.ts).
// Pure: no file is read. Called by buildParallax.ts. See raw_assets/mecard/parallax/METHOD_TRANSITION.md.

/** A layer of the painting, as the animation needs it: its place and size on the canvas, in pixels. */
export interface AnimLayer {
    readonly name: string
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number

    /**
     * What the layer is. `border`: cut on every edge of its picture, none of which may be seen (a background, an outline).
     * `object`: its edges are transparent pixels, it is not cut (an object).
     */
    readonly tag: LayerTag
}

export type LayerTag = "border"|"object"

export const LAYER_TAGS: readonly LayerTag[] = ["border", "object"]

/** `boring`: not interesting, to be avoided when several. `bug`: a visual defect, to have none of. */
export type Severity = "boring"|"bug"

export interface AnimWarning {
    /** What names the rule: `uncovered`, `visible-border`… */
    readonly key: string
    readonly severity: Severity
    readonly text: string
}

export interface AnimResult {
    /** The name of each layer given, in the same order, its frames written in. */
    readonly names: readonly string[]

    /** The composed frames of each layer, one line per layer, to read without rendering. */
    readonly table: readonly string[]

    /** What the render will look like, which is not wrong but worth a look. */
    readonly warnings: readonly AnimWarning[]
}

/** The name of the track moving every layer. */
export const GLOBAL_TRACK = "global"

/** How close two numbers are to be taken as the same. */
const EPSILON = 1e-6

/** Where a zoom is centered: a point of the canvas, in its widths and heights, or the painted center of a layer. */
type Pivot = { readonly point: readonly [number, number] }|{ readonly layer: string }

/** Where a picture stands at a step, before the global track is applied. */
interface State {
    readonly x: number
    readonly y: number
    readonly z: number
    readonly a: number
    readonly on: Pivot|null
}

/** A frame as the engine reads it. */
interface Frame {
    readonly x: number
    readonly y: number
    readonly z: number
    readonly a: number
}

interface Track {
    readonly steps: readonly State[]

    /** The step the middle comes at, none when the track does not mark it. */
    readonly middle: number|null
}

const REST: State = { x: 0, y: 0, z: 1, a: 1, on: null }

/**
 * Compile an animation.
 *
 * @param lines - One track per line: `<layer|global>: <step> > <step> > …`. A step is operations on the step before:
 * `x+0.1`, `y-0.5`, `z*3`, `a*0.5` (relative), `x=0`, `y=0.2`, `z=1`, `a=0` (absolute), `on=0.5;0.3` or `on=<layer>`
 * (the point a zoom is centered on, kept from step to step), `hold` or nothing (the step before again),
 * `repeat=N` (the step N times), `m` (the middle comes after this step). The first step is absolute.
 * @param layers - The layers, as the painting lists them.
 * @param canvas - The size of the canvas, in pixels.
 * @throws {@link Error} When the animation is not well written, or a middle is wrong.
 */
export function compileAnim(
    lines: readonly string[], layers: readonly AnimLayer[], canvas: { readonly width: number, readonly height: number },
): AnimResult {
    for(const layer of layers){
        if(layer.name === "" || /[\s:]/.test(layer.name) || layer.name === GLOBAL_TRACK){
            throw new Error(`anim : le calque « ${layer.name} » doit avoir un nom sans espace ni « : », et autre que « ${GLOBAL_TRACK} ».`)
        }
    }
    const tracks = readTracks(lines, layers)
    const count = [...tracks.values()][0].steps.length
    const middle = middleOf(tracks, count)
    const composed = composeAll(tracks, layers, canvas, count)
    checkMiddle(composed, layers, tracks, middle)
    checkEnds(composed, layers, canvas)
    return {
        names: layers.map((layer, index) => nameOf(layer.name, composed[index], middle)),
        table: layers.map((layer, index) => tableLine(layer.name, composed[index], middle)),
        warnings: renderWarnings(composed, layers, canvas, tracks, middle),
    }
}


//// Reading ////

/** The relative and absolute operations of a step: `y-0.5`, `z*3`, `a=0`. */
const OPERATION = /^([xyza])(=|\+|-|\*)(-?(?:\d+\.?\d*|\.\d+))$/

function readTracks(lines: readonly string[], layers: readonly AnimLayer[]): Map<string, Track> {
    const tracks = new Map<string, Track>()
    for(const line of lines){
        const colon = line.indexOf(":")
        if(colon < 0) throw new Error(`anim : la ligne « ${line} » n'a pas la forme « calque: étape > étape ».`)
        const name = line.slice(0, colon).trim()
        if(name !== GLOBAL_TRACK && !layers.some(layer => layer.name === name)){
            throw new Error(`anim : la piste « ${name} » n'est ni « ${GLOBAL_TRACK} » ni un calque, parmi ${layers.map(layer => layer.name).join(", ")}.`)
        }
        if(tracks.has(name)) throw new Error(`anim : la piste « ${name} » est écrite deux fois.`)
        tracks.set(name, readTrack(name, line.slice(colon + 1), layers))
    }
    if(tracks.size === 0) throw new Error("anim : aucune piste, écrire au moins une ligne « calque: étape > étape ».")
    const first = [...tracks.entries()][0]
    for(const [name, track] of tracks){
        if(track.steps.length !== first[1].steps.length){
            throw new Error(`anim : la piste « ${name} » a ${track.steps.length} étapes et « ${first[0]} » ${first[1].steps.length} :`
                + " toutes les pistes ont autant d'étapes.")
        }
    }
    if(first[1].steps.length < 3) throw new Error("anim : il faut au moins 3 étapes (entrée, milieu, sortie).")
    return tracks
}

function readTrack(name: string, text: string, layers: readonly AnimLayer[]): Track {
    const steps: State[] = []
    let middle: number|null = null
    text.split(">").forEach((step, index) => {
        const where = `anim, piste « ${name} », étape ${index + 1}`
        const tokens = step.split(/\s+/).filter(token => token !== "")
        let repeat = 1
        let marks = false
        const operations: string[] = []
        let on: Pivot|null|undefined
        for(const token of tokens){
            if(token === "m") marks = true
            else if(token === "hold") operations.push(token)
            else if(token.startsWith("repeat=")){
                repeat = Number(token.slice(7))
                if(!Number.isInteger(repeat) || repeat < 1) throw new Error(`${where} : « ${token} » doit être un entier d'au moins 1.`)
            } else if(token.startsWith("on=")) on = pivotOf(token.slice(3), where, layers)
            else if(OPERATION.test(token)) operations.push(token)
            else throw new Error(`${where} : « ${token} » n'est pas une opération (x+0.1, y-0.5, z*3, a=0, on=0.5;0.3, hold, repeat=2, m).`)
        }
        if(steps.length === 0){
            for(const token of operations){
                if(token === "hold" || OPERATION.exec(token)![2] !== "="){
                    throw new Error(`${where} : la première étape est absolue (x=… y=… z=… a=…) : « ${token} » n'a rien à quoi se rapporter.`)
                }
            }
        }
        for(let copy = 0; copy < repeat; copy++){
            let state: State = steps.length === 0 ? REST : steps[steps.length - 1]
            if(on !== undefined) state = { ...state, on }
            for(const token of operations) state = apply(state, token, where)
            steps.push(state)
        }
        if(marks){
            if(middle !== null) throw new Error(`${where} : le milieu (m) est déjà marqué à l'étape ${middle + 1}.`)
            middle = steps.length - 1
        }
    })
    return { steps, middle }
}

function apply(state: State, token: string, where: string): State {
    if(token === "hold") return state
    const [, key, how, text] = OPERATION.exec(token)!
    const value = Number(text)
    const current = state[key as "x"|"y"|"z"|"a"]
    const next = how === "=" ? value : how === "+" ? current + value : how === "-" ? current - value : current * value
    if(key === "a" && (next < -EPSILON || next > 1 + EPSILON)) throw new Error(`${where} : « ${token} » donne une opacité de ${next}, hors de 0 à 1.`)
    if(key === "z" && next < -EPSILON) throw new Error(`${where} : « ${token} » donne une taille de ${next}, sous 0.`)
    return { ...state, [key]: next }
}

function pivotOf(text: string, where: string, layers: readonly AnimLayer[]): Pivot {
    if(layers.some(layer => layer.name === text)) return { layer: text }
    const parts = text.split(";").map(part => part.trim() === "" ? NaN : Number(part))
    if(parts.length === 2 && parts.every(Number.isFinite)) return { point: [parts[0], parts[1]] }
    throw new Error(`${where} : « on=${text} » doit être un calque (${layers.map(layer => layer.name).join(", ")}) ou un point « x;y ».`)
}

/** The step the middle comes at, the same on every track marking it. */
function middleOf(tracks: ReadonlyMap<string, Track>, count: number): number {
    let middle: { at: number, by: string }|null = null
    for(const [name, track] of tracks){
        if(track.middle === null) continue
        if(middle && middle.at !== track.middle){
            throw new Error(`anim : les pistes « ${middle.by} » et « ${name} » marquent le milieu (m) aux étapes ${middle.at + 1} et ${track.middle + 1}.`)
        }
        middle = { at: track.middle, by: name }
    }
    if(!middle) throw new Error("anim : le milieu n'est marqué par aucune piste, écrire « m » après l'étape où l'écran est couvert.")
    if(middle.at === 0 || middle.at === count - 1){
        throw new Error(`anim : le milieu (m) est à l'étape ${middle.at + 1} de ${count} : il faut une entrée avant et une sortie après.`)
    }
    return middle.at
}


//// Composition ////

/** The composed frames of each layer, as the engine will play them, layer by layer. */
function composeAll(
    tracks: ReadonlyMap<string, Track>, layers: readonly AnimLayer[], canvas: { readonly width: number, readonly height: number }, count: number,
): Frame[][] {
    const center = (layer: AnimLayer) => [(layer.x + layer.width / 2) / canvas.width, (layer.y + layer.height / 2) / canvas.height] as const
    const centerOf = (name: string) => center(layers.find(layer => layer.name === name)!)
    const pointOf = (pivot: Pivot|null): readonly [number, number]|null => {
        if(!pivot) return null
        return "point" in pivot ? pivot.point : centerOf(pivot.layer)
    }
    const global = tracks.get(GLOBAL_TRACK)
    return layers.map(layer => {
        const own = tracks.get(layer.name)
        const [cx, cy] = center(layer)
        const frames: Frame[] = []
        for(let step = 0; step < count; step++){
            const local = own?.steps[step] ?? REST
            const all = global?.steps[step] ?? REST
            // Its own zoom is around its center, or around its pivot.
            const around = pointOf(local.on)
            const localX = around ? around[0] + local.z * (cx - around[0]) + local.x : cx + local.x
            const localY = around ? around[1] + local.z * (cy - around[1]) + local.y : cy + local.y
            // The global one is around the pivot of the global track, the middle of the canvas by default.
            const [px, py] = pointOf(all.on) ?? [0.5, 0.5]
            frames.push({
                x: round(px + all.x + all.z * (localX - px) - cx),
                y: round(py + all.y + all.z * (localY - py) - cy),
                z: round(all.z * local.z),
                a: round(all.a * local.a),
            })
        }
        return frames
    })
}

function round(value: number): number {
    return Number(value.toFixed(6))
}


//// Checks ////

const near = (a: number, b: number) => Math.abs(a - b) <= EPSILON

function checkMiddle(
    composed: readonly Frame[][], layers: readonly AnimLayer[], tracks: ReadonlyMap<string, Track>, middle: number,
): void {
    const global = tracks.get(GLOBAL_TRACK)?.steps[middle]
    if(global && (!near(global.x, 0) || !near(global.y, 0) || !near(global.z, 1))){
        throw new Error(`anim : la piste « ${GLOBAL_TRACK} » est décalée ou zoomée au milieu (étape ${middle + 1}) : x ${global.x}, y ${global.y}, z ${global.z}.`
            + " Au milieu, tout est à sa place peinte (x 0, y 0, z 1) ; son opacité est libre.")
    }
    layers.forEach((layer, index) => {
        const frame = composed[index][middle]
        if(!near(frame.x, 0) || !near(frame.y, 0) || !near(frame.z, 1)){
            throw new Error(`anim : le calque « ${layer.name} » n'est pas à sa place peinte au milieu (étape ${middle + 1}) :`
                + ` x ${frame.x}, y ${frame.y}, z ${frame.z}. Au milieu, rien n'est décalé ni zoomé ; son opacité est libre.`)
        }
    })
}

/** Where the picture of a layer stands at a frame, in widths and heights of the canvas. */
function boxOf(frame: Frame, layer: AnimLayer, canvas: { readonly width: number, readonly height: number }) {
    const cx = (layer.x + layer.width / 2) / canvas.width + frame.x
    const cy = (layer.y + layer.height / 2) / canvas.height + frame.y
    const halfWidth = layer.width / canvas.width * frame.z / 2
    const halfHeight = layer.height / canvas.height * frame.z / 2
    return { left: cx - halfWidth, right: cx + halfWidth, top: cy - halfHeight, bottom: cy + halfHeight }
}

/** The calque is not seen: no opacity, no size, or entirely out of the canvas. */
function empty(frame: Frame, layer: AnimLayer, canvas: { readonly width: number, readonly height: number }): boolean {
    if(frame.a <= EPSILON || frame.z <= EPSILON) return true
    const box = boxOf(frame, layer, canvas)
    return box.right <= 0 || box.left >= 1 || box.bottom <= 0 || box.top >= 1
}

function checkEnds(composed: readonly Frame[][], layers: readonly AnimLayer[], canvas: { readonly width: number, readonly height: number }): void {
    layers.forEach((layer, index) => {
        const frames = composed[index]
        for(const [which, at] of [["au début", 0], ["à la fin", frames.length - 1]] as const){
            if(!empty(frames[at], layer, canvas)){
                const frame = frames[at]
                throw new Error(`anim : le calque « ${layer.name} » est encore visible ${which} (étape ${at + 1}) : x ${frame.x}, y ${frame.y}, z ${frame.z}, a ${frame.a}.`
                    + " Au début et à la fin, aucun calque ne couvre quoi que ce soit : opacité 0, taille 0 ou sorti du canevas.")
            }
        }
    })
}


//// Warnings ////

function renderWarnings(
    composed: readonly Frame[][], layers: readonly AnimLayer[], canvas: { readonly width: number, readonly height: number },
    tracks: ReadonlyMap<string, Track>, middle: number,
): AnimWarning[] {
    const warnings: AnimWarning[] = []
    const warn = (key: string, severity: Severity, text: string) => warnings.push({ key, severity, text })
    const count = composed[0].length
    const delta = (index: number, step: number): Frame => {
        const from = composed[index][step], to = composed[index][step + 1]
        return { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z, a: to.a - from.a }
    }
    const same = (a: Frame, b: Frame) => near(a.x, b.x) && near(a.y, b.y) && near(a.z, b.z) && near(a.a, b.a)
    const uniform = (step: number) => layers.every((_, index) => same(delta(index, step), delta(0, step)))
    const steps = Array.from({ length: count - 1 }, (_, step) => step)

    if(layers.length > 1 && steps.every(uniform)){
        warn("simple-motion", "boring", "tous les calques bougent exactement pareil à chaque étape : l'ensemble se comporte comme une seule grosse image,"
            + " sans profondeur. Faire bouger certains calques autrement.")
    }
    const fadeOnly = (step: number, direction: 1|-1) => layers.every((_, index) => {
        const change = delta(index, step)
        return near(change.x, 0) && near(change.y, 0) && near(change.z, 0) && change.a * direction >= -EPSILON
            && near(composed[index][direction === 1 ? step : step + 1].a, 0)
    })
    if(fadeOnly(0, 1)){
        warn("simple-fade-in", "boring", "l'entrée (étapes 1 à 2) n'est qu'un fondu égal de tous les calques, sans mouvement : peu de relief.")
    }
    if(fadeOnly(count - 2, -1)){
        warn("simple-fade-out", "boring", `la sortie (étapes ${count - 1} à ${count}) n'est qu'un fondu égal de tous les calques, sans mouvement :`
            + " peu de relief.")
    }
    for(const [name, track] of tracks){
        // A zoom with no point to zoom on: there is nearly always a good reason to have one, little is centered at 100 %.
        const unfocused = track.steps.findIndex((state, step) => step > 0 && state.on === null && !near(state.z, track.steps[step - 1].z))
        if(unfocused >= 0){
            warn("center-zoom", "boring", `la piste « ${name} » zoome sans « on= » à l'étape ${unfocused + 1} : le zoom est centré sur le calque`
                + " (ou le canevas pour global). Y a-t-il une raison de ne pas viser un point ?")
        }
        track.steps.forEach((state, step) => {
            if(step === 0) return
            const before = track.steps[step - 1]
            const key = (pivot: Pivot|null) => pivot === null ? "" : "point" in pivot ? pivot.point.join(";") : pivot.layer
            if(key(state.on) !== key(before.on) && !near(before.z, 1)){
                warn("pivot-jump", "bug", `la piste « ${name} » change de point de zoom à l'étape ${step + 1} alors que sa taille n'est pas à 1 :`
                    + " le calque saute.")
            }
        })
    }
    layers.forEach((layer, index) => {
        if(layer.tag !== "border") return
        composed[index].forEach((frame, step) => {
            if(frame.a <= EPSILON || frame.z <= EPSILON) return
            const box = boxOf(frame, layer, canvas)
            const inside = (["left", "right", "top", "bottom"] as const).filter(side => box[side] > EPSILON && box[side] < 1 - EPSILON)
            if(inside.length > 0){
                warn("visible-border", "bug", `le calque « ${layer.name} » (border) a un bord dans le canevas à l'étape ${step + 1} : ${inside.join(", ")}.`
                    + " Aucun bord d'un calque border ne doit se voir.")
            }
        })
    })
    const covered = uncovered(composed, layers, canvas, middle)
    if(covered > EPSILON){
        warn("uncovered", "bug", `${(covered * 100).toFixed(1)} % du canevas n'est pas couvert, au milieu (étape ${middle + 1}), par la boîte des calques`
            + " pleinement opaques : l'écran se voit peut-être au milieu, ou des calques sont à moitié opaques.")
    }
    return warnings
}

/** The share of the canvas the boxes of the layers fully opaque at the middle leave bare. */
function uncovered(
    composed: readonly Frame[][], layers: readonly AnimLayer[], canvas: { readonly width: number, readonly height: number }, middle: number,
): number {
    const boxes = layers.flatMap((layer, index) => {
        const frame = composed[index][middle]
        if(frame.a < 1 - EPSILON) return []
        const left = (layer.x / canvas.width + frame.x), top = (layer.y / canvas.height + frame.y)
        return [{ left, top, right: left + layer.width / canvas.width, bottom: top + layer.height / canvas.height }]
    })
    const cuts = (low: (box: typeof boxes[number]) => number, high: (box: typeof boxes[number]) => number) =>
        [...new Set([0, 1, ...boxes.flatMap(box => [low(box), high(box)])].map(value => Math.min(1, Math.max(0, value))))].sort((a, b) => a - b)
    const xs = cuts(box => box.left, box => box.right)
    const ys = cuts(box => box.top, box => box.bottom)
    let bare = 0
    for(let column = 0; column < xs.length - 1; column++){
        for(let row = 0; row < ys.length - 1; row++){
            const x = (xs[column] + xs[column + 1]) / 2, y = (ys[row] + ys[row + 1]) / 2
            if(!boxes.some(box => box.left <= x && x <= box.right && box.top <= y && y <= box.bottom)){
                bare += (xs[column + 1] - xs[column]) * (ys[row + 1] - ys[row])
            }
        }
    }
    return bare
}


//// Output ////

function frameText(frame: Frame): string {
    return `${frame.x};${frame.y};${frame.z};${frame.a}`
}

function nameOf(name: string, frames: readonly Frame[], middle: number): string {
    return `${name} ${frames.map((frame, step) => frameText(frame) + (step === middle ? " m" : "")).join(" ")}`
}

function tableLine(name: string, frames: readonly Frame[], middle: number): string {
    return `${name.padEnd(10)} ${frames.map((frame, step) => (frameText(frame) + (step === middle ? " m" : "")).padEnd(22)).join("")}`.trimEnd()
}
