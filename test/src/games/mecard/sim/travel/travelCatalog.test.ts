import { describe, expect, test } from "vitest"
import { CHEST_HALT } from "@game/core/mecard"
import type {
    CatalogChoosing, CatalogDialog, CatalogPick, Dialog, HaltContext, HaltType, Travel,
} from "@game/core/mecard"

import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** The last dialog opened, of the sort the test knows it is. */
function open<T extends Dialog>(travel: Travel): T {
    const dialog = travel.dialogs.at(-1)
    if(!dialog) throw new Error("No dialog is open.")
    return dialog as T
}

/** A halt that asks for a thing of the catalogue and keeps what it is given. */
function askingHalt(picked: CatalogPick[], choosing: CatalogChoosing): HaltType {
    return {
        ...CHEST_HALT,
        create: run => Object.assign(CHEST_HALT.create(run), {
            start: (ctx: HaltContext) => {
                ctx.catalog("Quoi ?", choosing, pick => picked.push(pick))
            },
        }),
    }
}

// --- Tests ---

describe("Travel, a thing of the catalogue asked for", () => {
    test("a halt asking → told, the dialog holding the types and the names allowed", () => {
        const { travel } = startedRun(3)
        let told = 0
        travel.catalogAsked.add(() => told++)
        travel.visit(askingHalt([], { allowed: ["monsters", "kits"], keys: new Set(["Gobelin"]) }))
        const dialog = open<CatalogDialog>(travel)
        expect(told).toBe(1)
        expect(dialog.allowed).toEqual(["monsters", "kits"])
        expect(dialog.keys).toEqual(new Set(["Gobelin"]))
        expect(dialog.back).toBe(false)
    })

    test("no names given → every name may be picked", () => {
        const { travel } = startedRun(3)
        travel.visit(askingHalt([], { allowed: ["cards"] }))
        expect(open<CatalogDialog>(travel).keys).toBeNull()
    })

    test("a thing taken → told, and given to the halt", () => {
        const { travel } = startedRun(3)
        const picked: CatalogPick[] = []
        const taken: (CatalogPick|undefined)[] = []
        travel.catalogTaken.add(answer => taken.push(answer.pick))
        travel.visit(askingHalt(picked, { allowed: ["monsters"] }))
        travel.takeCatalog(open<CatalogDialog>(travel), { category: "monsters", key: "Gobelin" })
        expect(picked).toEqual([{ category: "monsters", key: "Gobelin" }])
        expect(taken).toEqual([{ category: "monsters", key: "Gobelin" }])
    })

    test("a type not allowed → refused, nothing given", () => {
        const { travel } = startedRun(3)
        const picked: CatalogPick[] = []
        travel.visit(askingHalt(picked, { allowed: ["monsters"] }))
        const dialog = open<CatalogDialog>(travel)
        expect(() => travel.takeCatalog(dialog, { category: "kits", key: "Lancier" })).toThrow()
        expect(picked).toEqual([])
    })

    test("a name not among the keys → refused", () => {
        const { travel } = startedRun(3)
        const picked: CatalogPick[] = []
        travel.visit(askingHalt(picked, { allowed: ["monsters"], keys: new Set(["Gobelin"]) }))
        const dialog = open<CatalogDialog>(travel)
        expect(() => travel.takeCatalog(dialog, { category: "monsters", key: "Loup" })).toThrow()
        expect(picked).toEqual([])
    })

    test("a dialog no longer open → refused", () => {
        const { travel } = startedRun(3)
        travel.visit(askingHalt([], { allowed: ["monsters"] }))
        const dialog = open<CatalogDialog>(travel)
        travel.leave()
        expect(() => travel.takeCatalog(dialog, { category: "monsters", key: "Gobelin" })).toThrow()
    })

    test("a way back given → the dialog may go back", () => {
        const { travel } = startedRun(3)
        travel.visit(askingHalt([], { allowed: ["monsters"], back: () => {} }))
        expect(open<CatalogDialog>(travel).back).toBe(true)
    })
})
