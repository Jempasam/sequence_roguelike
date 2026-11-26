import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { ASSET_PATHS } from "@game/core"
import { Box, Disk, Vector2 } from "@game/core/mecard"
import { hitboxMetrics } from "@game/core/mecard/hitbox-metrics"
import { readAnimation } from "@game/core/mecard/fx-animation"
import { DEFAULT_LOOK, readSpriteLook, SPRITE_MODES, writtenSpriteLook } from "@game/core/mecard/sprite-look"

// --- Tests ---

describe("readSpriteLook", () => {
    test("no data → the default look", () => {
        expect(readSpriteLook(null)).toBe(DEFAULT_LOOK)
        expect(readSpriteLook(undefined)).toBe(DEFAULT_LOOK)
    })

    test("every mode, and a lift → read as written", () => {
        for(const mode of SPRITE_MODES) expect(readSpriteLook({ mode })).toEqual({ ...DEFAULT_LOOK, mode })
        expect(readSpriteLook({ lift: 0.4 })).toEqual({ ...DEFAULT_LOOK, lift: 0.4 })
    })

    test("tags → read as written, an unknown tag refused", () => {
        expect(readSpriteLook({ tags: ["fly", "ghost"] }).tags).toEqual(["fly", "ghost"])
        expect(readSpriteLook({}).tags).toEqual([])
        expect(() => readSpriteLook({ tags: ["flying"] })).toThrow(/"tags"/)
        expect(() => readSpriteLook({ tags: "fly" })).toThrow(/"tags"/)
    })

    test("an animation → its form with the defaults of the form, the fields written over them", () => {
        const look = readSpriteLook({ animation: { form: "claw", duration: 0.5, trail: 2 } })
        expect(look.animation?.form).toBe("claw")
        expect(look.animation?.count).toBe(3)
        expect(look.animation?.duration).toBe(0.5)
        expect(look.animation?.trail).toBe(2)
        expect(look.animation?.size).toBe("area")
        expect(readSpriteLook({ animation: { form: "hit" } }).animation?.size).toBe("target")
    })

    test("a bad animation → an error saying where and what to write", () => {
        expect(() => readSpriteLook({ animation: [] })).toThrow(/"animation"/)
        expect(() => readSpriteLook({ animation: {} })).toThrow(/"animation.form"/)
        expect(() => readSpriteLook({ animation: { form: "wave", speed: 1 } })).toThrow(/"animation.speed" n'est pas connu/)
        expect(() => readSpriteLook({ animation: { form: "stab", ease: "bumpy" } })).toThrow(/"animation.ease"/)
        expect(() => readSpriteLook({ animation: { form: "stab", frames: 1.5 } })).toThrow(/entier/)
        expect(() => readSpriteLook({ animation: { form: "stab", fade: 2 } })).toThrow(/"animation.fade"/)
        expect(() => readSpriteLook({ animation: { form: "stab", anchor: [1] } })).toThrow(/deux nombres/)
    })

    test("something that is not an object, an unknown key or a bad value → an error saying what to write", () => {
        expect(() => readSpriteLook([])).toThrow(/objet/)
        expect(() => readSpriteLook({ mod: "feet" })).toThrow(/"mod" n'est pas connu/)
        expect(() => readSpriteLook({ mode: "flying" })).toThrow(/"mode" vaut "flying"/)
        expect(() => readSpriteLook({ lift: "high" })).toThrow(/"lift"/)
    })

    test("writtenSpriteLook → the JSON that reads back as the same look, nothing for the default", () => {
        expect(writtenSpriteLook(DEFAULT_LOOK)).toBe("{}")
        const look = { ...DEFAULT_LOOK, mode: "wall", lift: 0.25 } as const
        expect(readSpriteLook(JSON.parse(writtenSpriteLook(look)))).toEqual(look)
    })

    test("writtenSpriteLook with tags and an animation → reads back as the same look, defaults left out", () => {
        const animation = readAnimation({ form: "sweep", trail: 3, anchor: [0, 4], impact: "impact", flip: true })
        const look = { ...DEFAULT_LOOK, tags: ["fly"], animation } as const
        const written = JSON.parse(writtenSpriteLook(look))
        expect(written.animation).toEqual({ form: "sweep", trail: 3, anchor: [0, 4], impact: "impact", flip: true })
        expect(readSpriteLook(written)).toEqual(look)
    })
})

describe("the JSON files of the units the game ships", () => {
    const ROOT = join(__dirname, "../../../../../..")
    const shipped = ASSET_PATHS.filter(path => path.startsWith("mecard/units/") && path.endsWith(".json"))
    const read = (path: string) => JSON.parse(readFileSync(
        ["assets", "generated_assets"].map(root => join(ROOT, root, path)).find(file => existsSync(file)) as string, "utf8"))

    test("each → a look the board understands", () => {
        expect(shipped.length).toBeGreaterThan(0)
        for(const path of shipped) expect(() => readSpriteLook(read(path)), path).not.toThrow()
    })

    test("the test sprites → each in the mode of its theme", () => {
        const modes: Record<string, string> = {
            statues: "feet", floating: "center", rugs: "cover", walls: "wall", plants: "repeat",
            grounds: "tile", machines: "spin", barriers: "capped",
        }
        const tests = shipped.filter(path => path.startsWith("mecard/units/test/"))
        expect(tests).toHaveLength(16)
        for(const path of tests) expect(readSpriteLook(read(path)).mode, path).toBe(modes[path.split("/")[3]])
    })
})

describe("hitboxMetrics", () => {
    const at = (x: number, y: number, direction = new Vector2(1, 0)) => ({ position: new Vector2(x, y), direction })

    test("a disc → a square bounding box of its diameter, the same disc around and inside", () => {
        const metrics = hitboxMetrics(new Disk(0.5), at(3, 4))
        expect(metrics.center).toEqual(new Vector2(3, 4))
        expect([metrics.length, metrics.width, metrics.outer, metrics.inner]).toEqual([1, 1, 1, 1])
    })

    test("a box → its length along where it faces, the circle around it by its diagonal, the one inside by its width", () => {
        const metrics = hitboxMetrics(new Box(4, 3), at(0, 0, new Vector2(0, 1)))
        expect(metrics.direction).toEqual(new Vector2(0, 1))
        expect([metrics.length, metrics.width]).toEqual([4, 3])
        expect(metrics.outer).toBeCloseTo(5)
        expect(metrics.inner).toBeCloseTo(3)
    })

    test("any hitbox → the inner disc is no larger than the outer one", () => {
        for(const hitbox of [new Disk(0.3), new Box(1, 1), new Box(5, 0.2)]){
            const metrics = hitboxMetrics(hitbox, at(0, 0))
            expect(metrics.inner).toBeLessThanOrEqual(metrics.outer)
        }
    })
})
