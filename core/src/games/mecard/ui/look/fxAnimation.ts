/** The shapes a blow can take on the screen: how its picture moves over the area it strikes. */
export const FX_FORMS = [
    "sweep", "stab", "slam", "claw", "bite", "burst", "wave", "rain", "shot", "stretch", "bolt", "hit",
] as const

/** One of the shapes of a blow, see {@link FX_FORMS}. */
export type FxForm = typeof FX_FORMS[number]

/** The curves the progress of a blow follows, from 0 to 1. */
export const FX_EASES = ["linear", "in", "out", "inout"] as const

/** One of the curves of a blow, see {@link FX_EASES}. */
export type FxEase = typeof FX_EASES[number]

/** What a picture is scaled to: the area it strikes, its own size, or the size of the unit it lands on. */
export const FX_SIZES = ["area", "fixed", "target"] as const

/** One of the scales of a picture of a blow, see {@link FX_SIZES}. */
export type FxSize = typeof FX_SIZES[number]

/** How a picture of a blow is mixed with what lies under it. */
export const FX_BLENDS = ["alpha", "additive"] as const

/** One of the mixes of a picture of a blow, see {@link FX_BLENDS}. */
export type FxBlend = typeof FX_BLENDS[number]

/** How the picture of a blow plays, written in the `animation` of its JSON file. */
export interface FxAnimation {
    readonly form: FxForm

    /** The key, under `fx/`, of a `hit` picture played on each unit the blow touches. None for none. */
    readonly impact: string|null

    /** How many strokes (`claw`), falls (`rain`) or segments (`bolt`) it has. */
    readonly count: number

    /** How many degrees a flying picture turns in a second (`shot`). */
    readonly spin: number

    /** How high, in meters, a flying picture rises over its way: 0 flies straight (`shot`). */
    readonly arc: number

    /** The pixel of the picture held still, none for the middle of its left edge. */
    readonly anchor: readonly [number, number]|null

    /** How long the drawing is along the blow, in pixels, none for the width of a frame. */
    readonly length: number|null

    /** How wide the drawing is across the blow, in pixels, none for the height of a frame. */
    readonly width: number|null

    /** How many frames the picture holds, side by side. */
    readonly frames: number

    /** How long it plays, in seconds. */
    readonly duration: number

    readonly ease: FxEase

    /** The last share of its life spent fading out, 0 to vanish at once. */
    readonly fade: number
    readonly size: FxSize
    readonly blend: FxBlend

    /** How many copies of the blade follow it (`sweep`). */
    readonly trail: number

    /** Is it mirrored by the side the blow goes? */
    readonly flip: boolean
}

/** What a form is when its file says nothing of it. */
interface FormDefaults {
    readonly count: number
    readonly duration: number
    readonly size: FxSize
}

const FORM_DEFAULTS: Readonly<Record<FxForm, FormDefaults>> = {
    sweep: { count: 1, duration: 0.2, size: "area" },
    stab: { count: 1, duration: 0.2, size: "area" },
    slam: { count: 1, duration: 0.25, size: "area" },
    claw: { count: 3, duration: 0.25, size: "area" },
    bite: { count: 1, duration: 0.25, size: "area" },
    burst: { count: 1, duration: 0.2, size: "target" },
    wave: { count: 1, duration: 0.3, size: "area" },
    rain: { count: 5, duration: 0.4, size: "fixed" },
    shot: { count: 1, duration: 0.2, size: "fixed" },
    stretch: { count: 1, duration: 0.15, size: "area" },
    bolt: { count: 6, duration: 0.2, size: "area" },
    hit: { count: 1, duration: 0.15, size: "target" },
}

/** The keys of the `animation` of a JSON file that mean something. */
const KEYS: readonly string[] = [
    "form", "impact", "count", "spin", "arc", "anchor", "length", "width", "frames", "duration", "ease", "fade",
    "size", "blend", "trail", "flip",
]

/** The animation a form plays when its file says nothing else of it. */
export function defaultAnimation(form: FxForm): FxAnimation {
    const defaults = FORM_DEFAULTS[form]
    return {
        form,
        impact: null,
        count: defaults.count,
        spin: 0,
        arc: 0,
        anchor: null,
        length: null,
        width: null,
        frames: 1,
        duration: defaults.duration,
        ease: "out",
        fade: 0.3,
        size: defaults.size,
        blend: "alpha",
        trail: 0,
        flip: false,
    }
}

/**
 * What the `animation` of the file of data of a picture says, checked.
 *
 * @param data - What the `animation` holds.
 * @throws {@link Error} Saying what is wrong, where, and what to write instead.
 */
export function readAnimation(data: unknown): FxAnimation {
    if(typeof data !== "object" || data === null || Array.isArray(data)){
        throw new Error(`"animation" doit contenir un objet, par exemple { "form": "sweep" }`)
    }
    const fields = data as Record<string, unknown>
    for(const key of Object.keys(fields)){
        if(!KEYS.includes(key)){
            throw new Error(`"animation.${key}" n'est pas connu : écris ${KEYS.map(each => `"${each}"`).join(", ")}`)
        }
    }
    const form = fields.form
    if(!FX_FORMS.includes(form as FxForm)){
        throw new Error(`"animation.form" vaut ${JSON.stringify(form)} : écris l'un de ${FX_FORMS.join(", ")}`)
    }
    const base = defaultAnimation(form as FxForm)
    return {
        form: base.form,
        impact: text(fields, "impact") ?? base.impact,
        count: whole(fields, "count", 1) ?? base.count,
        spin: number(fields, "spin") ?? base.spin,
        arc: number(fields, "arc", 0) ?? base.arc,
        anchor: pair(fields, "anchor") ?? base.anchor,
        length: number(fields, "length", 1) ?? base.length,
        width: number(fields, "width", 1) ?? base.width,
        frames: whole(fields, "frames", 1) ?? base.frames,
        duration: number(fields, "duration", 0.01) ?? base.duration,
        ease: oneOf(fields, "ease", FX_EASES) ?? base.ease,
        fade: number(fields, "fade", 0, 1) ?? base.fade,
        size: oneOf(fields, "size", FX_SIZES) ?? base.size,
        blend: oneOf(fields, "blend", FX_BLENDS) ?? base.blend,
        trail: whole(fields, "trail", 0) ?? base.trail,
        flip: flag(fields, "flip") ?? base.flip,
    }
}

/** An animation written as the object that gives it back, nothing for what its form has by default. */
export function writtenAnimation(animation: FxAnimation): Record<string, unknown> {
    const base = defaultAnimation(animation.form)
    const written: Record<string, unknown> = { form: animation.form }
    for(const key of KEYS){
        if(key === "form") continue
        const value = animation[key as keyof FxAnimation]
        const same = JSON.stringify(value) === JSON.stringify(base[key as keyof FxAnimation])
        if(!same) written[key] = value
    }
    return written
}

/** A text field, none when it is absent. */
function text(fields: Record<string, unknown>, key: string): string|null {
    const value = fields[key]
    if(value === undefined) return null
    if(typeof value !== "string" || value === ""){
        throw new Error(`"animation.${key}" vaut ${JSON.stringify(value)} : écris un nom de fichier sans extension`)
    }
    return value
}

/** A number field of at least a bound and at most another, none when it is absent. */
function number(
    fields: Record<string, unknown>, key: string, least = -Infinity, most = Infinity,
): number|null {
    const value = fields[key]
    if(value === undefined) return null
    if(typeof value !== "number" || !Number.isFinite(value) || value < least || value > most){
        const range = most === Infinity ? `d'au moins ${least}` : `entre ${least} et ${most}`
        throw new Error(`"animation.${key}" vaut ${JSON.stringify(value)} : écris un nombre ${range}`)
    }
    return value
}

/** A whole number field of at least a bound, none when it is absent. */
function whole(fields: Record<string, unknown>, key: string, least: number): number|null {
    const value = number(fields, key, least)
    if(value !== null && !Number.isInteger(value)){
        throw new Error(`"animation.${key}" vaut ${value} : écris un nombre entier`)
    }
    return value
}

/** A field of two numbers, none when it is absent. */
function pair(fields: Record<string, unknown>, key: string): readonly [number, number]|null {
    const value = fields[key]
    if(value === undefined) return null
    const good = Array.isArray(value) && value.length === 2 && value.every(each => typeof each === "number" && Number.isFinite(each))
    if(!good) throw new Error(`"animation.${key}" vaut ${JSON.stringify(value)} : écris deux nombres, par exemple [0, 8]`)
    return [value[0], value[1]]
}

/** A true or false field, none when it is absent. */
function flag(fields: Record<string, unknown>, key: string): boolean|null {
    const value = fields[key]
    if(value === undefined) return null
    if(typeof value !== "boolean") throw new Error(`"animation.${key}" vaut ${JSON.stringify(value)} : écris true ou false`)
    return value
}

/** A field naming one of some words, none when it is absent. */
function oneOf<T extends string>(fields: Record<string, unknown>, key: string, words: readonly T[]): T|null {
    const value = fields[key]
    if(value === undefined) return null
    if(!words.includes(value as T)){
        throw new Error(`"animation.${key}" vaut ${JSON.stringify(value)} : écris l'un de ${words.join(", ")}`)
    }
    return value as T
}
