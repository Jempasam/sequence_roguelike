import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { BlowCard } from "@game/core-src/games/mecard/sim/card/subs/attack/BlowCard"
import { ALL_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import * as BLOW_LOOKS from "@game/core/mecard/blow-looks"
import { readSpriteLook, SPRITE_TAGS } from "@game/core/mecard/sprite-look"
import { fxPath } from "@game/core/mecard/visual-path"

// --- Fixture builders ---

/** The root of the repository, whatever the folder the tests are run from. */
const ROOT = join(__dirname, "../../../../../..")

/** The file a path of the assets names, written by hand or generated, none when the game ships none. */
function shippedFile(path: string): string|null {
    return ["assets", "generated_assets"].map(root => join(ROOT, root, path)).find(file => existsSync(file)) ?? null
}

/** The names of the JSON files of the blows. */
const SIDECARS = ["assets", "generated_assets"]
    .flatMap(root => existsSync(join(ROOT, root, "mecard/fx")) ? readdirSync(join(ROOT, root, "mecard/fx")) : [])
    .filter(name => name.endsWith(".json"))
    .map(name => name.slice(0, -".json".length))

// --- Tests ---

describe("the pictures of the blows the game ships", () => {
    test("each look a card gives its blow → its picture shipped under fx/", () => {
        const looks = ALL_CARDS.flatMap(card => card instanceof BlowCard && card.look ? [card.look] : [])
        expect(looks.length).toBeGreaterThan(0)
        for(const look of looks) expect(shippedFile(fxPath(look)), look.visual).not.toBeNull()
    })

    test("each look the cards share → its picture shipped under fx/", () => {
        const shared = Object.values(BLOW_LOOKS)
        expect(shared.length).toBeGreaterThan(0)
        for(const look of shared) expect(shippedFile(fxPath(look)), look.visual).not.toBeNull()
    })

    test("each JSON → a look the board understands, an animation of its own or of the picture it is a variant of", () => {
        expect(SIDECARS.length).toBeGreaterThan(0)
        for(const name of SIDECARS){
            const file = shippedFile(`mecard/fx/${name}.json`) as string
            const look = readSpriteLook(JSON.parse(readFileSync(file, "utf8")))
            const parent = name.includes("_") ? name.slice(0, name.lastIndexOf("_")) : null
            const parentFile = parent ? shippedFile(`mecard/fx/${parent}.json`) : null
            expect(look.animation !== null || parentFile !== null, name).toBe(true)
        }
    })

    test("a variant for a tag → shipped beside a picture of the same name, and a unit carrying the tag", () => {
        const variants = ["assets", "generated_assets"]
            .flatMap(root => existsSync(join(ROOT, root, "mecard/fx")) ? readdirSync(join(ROOT, root, "mecard/fx")) : [])
            .filter(name => name.endsWith(".png"))
            .map(name => name.slice(0, -".png".length))
            .filter(name => SPRITE_TAGS.some(tag => name.endsWith(`_${tag}`)))
        expect(variants.length).toBeGreaterThan(0)
        for(const variant of variants){
            const tag = variant.slice(variant.lastIndexOf("_") + 1)
            const base = variant.slice(0, variant.lastIndexOf("_"))
            expect(shippedFile(fxPath(base)), base).not.toBeNull()
            const carriers = ["assets", "generated_assets"]
                .flatMap(root => existsSync(join(ROOT, root, "mecard/units")) ? readdirSync(join(ROOT, root, "mecard/units")) : [])
                .filter(name => name.endsWith(".json"))
                .filter(name => readSpriteLook(JSON.parse(readFileSync(
                    shippedFile(`mecard/units/${name}`) as string, "utf8"))).tags.includes(tag as never))
            expect(carriers.length, variant).toBeGreaterThan(0)
        }
    })

    test("each impact a blow names → shipped as a picture of the form hit", () => {
        for(const name of SIDECARS){
            const look = readSpriteLook(JSON.parse(readFileSync(shippedFile(`mecard/fx/${name}.json`) as string, "utf8")))
            const impact = look.animation?.impact
            if(!impact) continue
            expect(shippedFile(fxPath(impact)), impact).not.toBeNull()
            const named = readSpriteLook(JSON.parse(readFileSync(shippedFile(`mecard/fx/${impact}.json`) as string, "utf8")))
            expect(named.animation?.form, impact).toBe("hit")
        }
    })
})
