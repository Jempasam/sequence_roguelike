import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test } from "vitest"
import { sourcesOf } from "../../../scripts/assetDependencies.ts"
import type { AssetRoots } from "../../../scripts/assetDependencies.ts"

// --- Fixtures ---

const root = mkdtempSync(join(tmpdir(), "asset-dependencies-"))
const ROOTS: AssetRoots = { art: join(root, "raw_assets"), assets: [join(root, "generated_assets"), join(root, "assets")] }

afterAll(() => rmSync(root, { recursive: true, force: true }))

/** Writes a file of the fixture and returns its path. */
function file(path: string, text = ""): string {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, text)
    return full
}

/** The paths of the fixture, shortened and sorted, to compare. */
function names(paths: string[]): string[] {
    return paths.map(path => path.slice(root.length + 1).split("\\").join("/")).sort()
}

function messageOf(run: () => unknown): string {
    try {
        run()
    } catch(error){
        if(error instanceof Error) return error.message
    }
    throw new Error("expected a failure")
}

// --- Tests ---

describe("sounds", () => {
    test("a sound depends on the files it imports, and on what they import in turn", () => {
        file("raw_assets/s/lib/timing.lib.dsp", "import(\"sfx.lib\");\nloc(a) = a;")
        file("raw_assets/s/filters/finish.lib.dsp", "tm = library(\"../lib/timing.lib.dsp\");")
        const sound = file("raw_assets/s/halt/chest.faust.dsp", "import(\"sfx.lib\");\nf = library(\"../filters/finish.lib.dsp\");")
        expect(names(sourcesOf(sound, ROOTS))).toEqual([
            "raw_assets/s/filters/finish.lib.dsp",
            "raw_assets/s/halt/chest.faust.dsp",
            "raw_assets/s/lib/timing.lib.dsp",
        ])
    })

    test("a library of the sound effect project is no dependency, as no file of ours has its name", () => {
        const sound = file("raw_assets/s/plain.faust.dsp", "import(\"sfx.lib\");\nimport(\"stdfaust.lib\");")
        expect(names(sourcesOf(sound, ROOTS))).toEqual(["raw_assets/s/plain.faust.dsp"])
    })

    test("a sound imported by another one is a dependency of it, and keeps its own", () => {
        file("raw_assets/s/chest.faust.dsp", "import(\"sfx.lib\");")
        const dark = file("raw_assets/s/dark_chest.faust.dsp", "chest = library(\"chest.faust.dsp\");")
        expect(names(sourcesOf(dark, ROOTS))).toEqual(["raw_assets/s/chest.faust.dsp", "raw_assets/s/dark_chest.faust.dsp"])
    })

    test("files importing each other are each listed once", () => {
        const a = file("raw_assets/s/a.lib.dsp", "b = library(\"b.lib.dsp\");")
        file("raw_assets/s/b.lib.dsp", "a = library(\"a.lib.dsp\");")
        expect(names(sourcesOf(a, ROOTS))).toEqual(["raw_assets/s/a.lib.dsp", "raw_assets/s/b.lib.dsp"])
    })
})

describe("pictures", () => {
    test("a picture laying in other documents depends on them, and on those they lay in", () => {
        file("raw_assets/p/parts/leaf.pic.json", "{\"shapes\": []}")
        file("raw_assets/p/parts/pot.pic.json", "{\"shapes\": [{\"picture\": \"leaf.pic.json\"}]}")
        const picture = file("raw_assets/p/tree.pic.json", "{\"shapes\": [{\"box\": [0, 0, 1, 1]}, {\"picture\": \"parts/pot.pic.json\"}]}")
        expect(names(sourcesOf(picture, ROOTS))).toEqual([
            "raw_assets/p/parts/leaf.pic.json",
            "raw_assets/p/parts/pot.pic.json",
            "raw_assets/p/tree.pic.json",
        ])
    })

    test("a picture laying in a document that is not there is refused with where it looked", () => {
        const picture = file("raw_assets/p/lost.pic.json", "{\"shapes\": [{\"picture\": \"parts/gone.pic.json\"}]}")
        expect(messageOf(() => sourcesOf(picture, ROOTS))).toContain(join(root, "raw_assets", "p", "parts", "gone.pic.json"))
    })

    test("a picture made of pixels depends on nothing", () => {
        const picture = file("raw_assets/p/pixels.pic.json", "{\"pixels\": []}")
        expect(names(sourcesOf(picture, ROOTS))).toEqual(["raw_assets/p/pixels.pic.json"])
    })
})

describe("paintings", () => {
    test("a painting depends on every file of its folder but its preview", () => {
        file("raw_assets/m/alley/1.pic.json", "{\"shapes\": []}")
        file("raw_assets/m/alley/parts/pot.pic.json", "{\"shapes\": []}")
        file("raw_assets/m/alley/preview.png")
        const painting = file("raw_assets/m/alley/parallax.json", "{\"layers\": []}")
        expect(names(sourcesOf(painting, ROOTS))).toEqual([
            "raw_assets/m/alley/1.pic.json",
            "raw_assets/m/alley/parallax.json",
            "raw_assets/m/alley/parts/pot.pic.json",
        ])
    })

    test("a layer taken from a painting built here makes the painting depend on the folder that builds it", () => {
        file("raw_assets/m/base/1.pic.json", "{\"shapes\": []}")
        file("raw_assets/m/base/parallax.json", "{\"layers\": []}")
        const painting = file("raw_assets/m/top/parallax.json", "{\"layers\": [{\"name\": \"a\", \"from\": {\"ora\": \"m/base.ora\", \"layer\": \"1\"}}]}")
        expect(names(sourcesOf(painting, ROOTS))).toEqual([
            "raw_assets/m/base/1.pic.json",
            "raw_assets/m/base/parallax.json",
            "raw_assets/m/top/parallax.json",
        ])
    })

    test("a layer taken from a handwritten painting makes the painting depend on it", () => {
        const kept = file("assets/m/old.ora")
        const painting = file("raw_assets/m/new/parallax.json", "{\"layers\": [{\"name\": \"a\", \"from\": {\"ora\": \"m/old.ora\", \"layer\": \"1\"}}]}")
        expect(names(sourcesOf(painting, ROOTS))).toContain(names([kept])[0])
    })

    test("a layer taken from a painting that is nowhere is refused with where it looked", () => {
        const painting = file("raw_assets/m/lost/parallax.json", "{\"layers\": [{\"name\": \"a\", \"from\": {\"ora\": \"m/nowhere.ora\", \"layer\": \"1\"}}]}")
        expect(messageOf(() => sourcesOf(painting, ROOTS))).toContain(join(root, "generated_assets"))
    })
})

describe("data", () => {
    test("a data json depends on nothing", () => {
        const data = file("raw_assets/d/wolf.json", "{}")
        expect(names(sourcesOf(data, ROOTS))).toEqual(["raw_assets/d/wolf.json"])
    })
})
