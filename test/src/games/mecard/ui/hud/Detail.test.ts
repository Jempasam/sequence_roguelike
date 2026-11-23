import { describe, expect, test } from "vitest"
import { Rect, Stack } from "@game/core"
import { Detail } from "@game/core/mecard/detail"
import type { DetailShown } from "@game/core/mecard/detail"

import { Probe, uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A container the pointer can be over, as a card made of cards is. */
class Holder extends Stack {
    protected override get interactive(): boolean { return true }
}

/** A container taking the pointer for itself, as an option of a choice does. */
class Option extends Holder {
    public override get holdsPointer(): boolean { return true }
}

/** A holder 40 wide with a part `a` over x 0..20 and a part `b` over x 20..40, all 20 high. */
function holder(): { setup: UiSetup, whole: Holder, a: Probe, b: Probe } {
    const setup = uiSetup()
    const whole = new Holder()
    whole.fixedSize = { width: 40, height: 20 }
    const a = new Probe("a", [20, 20], { interactive: true })
    const b = new Probe("b", [20, 20], { interactive: true })
    whole.add(a, { offsetX: 0, offsetY: 0 })
    whole.add(b, { offsetX: 20, offsetY: 0 })
    setup.main.content.add(whole, { offsetX: 0, offsetY: 0 })
    setup.ui.render()
    moveTo(setup, 200, 200)
    return { setup, whole, a, b }
}

/** Move the pointer and let the interface hear it. */
function moveTo(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y })
    setup.frame()
}

/** What a detail told, as `show text` and `hide`. */
function heardFrom(detail: Detail): string[] {
    const heard: string[] = []
    detail.listen({
        onShow: shown => heard.push(`show ${String(shown.text)}`),
        onHide: () => heard.push("hide"),
    })
    return heard
}

/** What a detail showed, in full, each time. */
function shownFrom(detail: Detail): DetailShown[] {
    const heard: DetailShown[] = []
    detail.listen({ onShow: shown => heard.push(shown), onHide: () => {} })
    return heard
}

// --- Tests ---

describe("Detail.under", () => {
    test("pointer moving across the component → the text follows the point, none where it says none", () => {
        const { setup, whole } = holder()
        const detail = Detail.under(whole, x => x < 15 ? { text: "gauche" } : x < 30 ? { text: "milieu" } : null)
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        moveTo(setup, 20, 5)
        moveTo(setup, 35, 5)
        moveTo(setup, 200, 200)
        expect(heard).toEqual(["show gauche", "show milieu", "hide"])
    })

    test("the text asked is the same object at two points → it is told once", () => {
        const { setup, whole } = holder()
        const detail = Detail.under(whole, () => ({ text: "même" }))
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        moveTo(setup, 6, 6)
        moveTo(setup, 7, 7)
        expect(heard).toEqual(["show même"])
    })

    test("pointer away from the component → nothing is asked", () => {
        const { setup, whole } = holder()
        let asked = 0
        Detail.under(whole, () => ++asked && { text: "x" })
        moveTo(setup, 200, 200)
        expect(asked).toBe(0)
    })

    test("an area given → it is what the text is about, and it is told again when it changes", () => {
        const { setup, whole } = holder()
        const detail = Detail.under(whole, x => ({ text: "même", area: new Rect(x < 20 ? 0 : 20, 0, 20, 20) }))
        const heard = shownFrom(detail)
        moveTo(setup, 5, 5)
        moveTo(setup, 6, 6)
        moveTo(setup, 25, 5)
        expect(heard.map(shown => shown.area.x)).toEqual([0, 20])
    })

    test("no area given → what the text is about is the area of the component", () => {
        const { setup, whole } = holder()
        const heard = shownFrom(Detail.under(whole, () => ({ text: "même" })))
        moveTo(setup, 5, 5)
        const { bounds } = whole
        expect(heard[0].area).toEqual(new Rect(bounds.x, bounds.y, bounds.width, bounds.height))
    })
})

describe("Detail.on", () => {
    test("pointer over the component then away → shows its text then hides", () => {
        const { setup, a } = holder()
        const detail = Detail.on(a, "A")
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        moveTo(setup, 200, 200)
        expect(heard).toEqual(["show A", "hide"])
    })

    test("text made by a function → made once while it stays shown, not before", () => {
        const { setup, a } = holder()
        let made = 0
        const detail = Detail.on(a, () => `made ${++made}`)
        const heard = heardFrom(detail)
        expect(made).toBe(0)
        moveTo(setup, 5, 5)
        moveTo(setup, 6, 6)
        expect(heard).toEqual(["show made 1"])
        expect(made).toBe(1)
    })
})

describe("Detail with children", () => {
    test("pointer over a part → the part tells, not the whole", () => {
        const { setup, whole, a, b } = holder()
        const detail = Detail.on(whole, "whole", [Detail.on(a, "A"), Detail.on(b, "B")])
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        expect(heard).toEqual(["show A"])
    })

    test("pointer going from a part to its sibling → shows each in turn without hiding", () => {
        const { setup, whole, a, b } = holder()
        const detail = Detail.on(whole, "whole", [Detail.on(a, "A"), Detail.on(b, "B")])
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        moveTo(setup, 25, 5)
        expect(heard).toEqual(["show A", "show B"])
    })

    test("pointer over the whole but no part → its own text", () => {
        const { setup, whole, a } = holder()
        const detail = Detail.on(whole, "whole", [Detail.on(a, "A")])
        const heard = heardFrom(detail)
        moveTo(setup, 25, 10)
        moveTo(setup, 5, 5)
        moveTo(setup, 25, 10)
        expect(heard).toEqual(["show whole", "show A", "show whole"])
    })

    test("pointer leaving the whole from a part → hides once", () => {
        const { setup, whole, a } = holder()
        const detail = Detail.on(whole, "whole", [Detail.on(a, "A")])
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        moveTo(setup, 200, 200)
        expect(heard).toEqual(["show A", "hide"])
    })
})

describe("Detail in a container holding the pointer", () => {
    test("pointer over a part of an option → the part tells, though the option is what is hovered", () => {
        const setup = uiSetup()
        const option = new Option()
        option.fixedSize = { width: 40, height: 20 }
        const a = new Probe("a", [20, 20], { interactive: true })
        option.add(a, { offsetX: 0, offsetY: 0 })
        setup.main.content.add(option, { offsetX: 0, offsetY: 0 })
        setup.ui.render()
        moveTo(setup, 200, 200)
        const detail = Detail.on(option, "option", [Detail.on(a, "A")])
        const heard = heardFrom(detail)
        moveTo(setup, 30, 5)
        moveTo(setup, 5, 5)
        moveTo(setup, 200, 200)
        expect(setup.ui.hovered).toBeNull()
        expect(heard).toEqual(["show option", "show A", "hide"])
    })
})

describe("Detail.all", () => {
    test("pointer over one of them → it shows what that one shows", () => {
        const { setup, a, b } = holder()
        const detail = Detail.all(Detail.on(a, "A"), Detail.on(b, "B"))
        const heard = heardFrom(detail)
        moveTo(setup, 25, 5)
        moveTo(setup, 200, 200)
        expect(heard).toEqual(["show B", "hide"])
    })
})

describe("Detail.none", () => {
    test("pointer anywhere → it shows nothing", () => {
        const { setup } = holder()
        const detail = Detail.none()
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        expect(heard).toEqual([])
        expect(detail.shown).toBeNull()
    })
})

describe("Detail.set", () => {
    test("own text shown then changed → it is shown again with no hiding", () => {
        const { setup, a } = holder()
        const detail = Detail.on(a, "before")
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        detail.set("after")
        expect(heard).toEqual(["show before", "show after"])
    })

    test("own text changed while a part is shown → nothing is told", () => {
        const { setup, whole, a } = holder()
        const detail = Detail.on(whole, "before", [Detail.on(a, "A")])
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        detail.set("after")
        expect(heard).toEqual(["show A"])
    })

    test("own text changed while nothing is hovered → nothing is told", () => {
        const { a } = holder()
        const detail = Detail.on(a, "before")
        const heard = heardFrom(detail)
        detail.set("after")
        expect(heard).toEqual([])
    })
})

describe("Detail.at", () => {
    test("point over a part, the whole, then outside → the part, the whole, none", () => {
        const { whole, a } = holder()
        const detail = Detail.on(whole, "whole", [Detail.on(a, "A")])
        const shown = [detail.at(5, 5), detail.at(25, 10), detail.at(200, 200)]
        expect(shown.map(each => each?.text ?? null)).toEqual(["A", "whole", null])
    })

    test("point over a part → what it is about is the area of the part, the point is the one asked", () => {
        const { whole, a } = holder()
        const shown = Detail.on(whole, "whole", [Detail.on(a, "A")]).at(5, 7)
        expect(shown?.area).toEqual(new Rect(a.bounds.x, a.bounds.y, 20, 20))
        expect(shown?.point).toEqual({ x: 5, y: 7 })
    })
})

describe("Detail.enabled", () => {
    test("disabled while shown → it hides, and shows again when enabled", () => {
        const { setup, a } = holder()
        const detail = Detail.on(a, "A")
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        detail.enabled = false
        detail.enabled = true
        expect(heard).toEqual(["show A", "hide", "show A"])
    })

    test("disabled → the pointer coming tells nothing", () => {
        const { setup, a } = holder()
        const detail = Detail.on(a, "A")
        detail.enabled = false
        const heard = heardFrom(detail)
        moveTo(setup, 5, 5)
        expect(heard).toEqual([])
    })

    test("a detail holding others disabled → its children tell nothing either", () => {
        const { setup, whole, a } = holder()
        const detail = Detail.on(whole, "whole", [Detail.on(a, "A")])
        const heard = heardFrom(detail)
        detail.enabled = false
        moveTo(setup, 5, 5)
        expect(heard).toEqual([])
    })

    test("a child disabled while shown → the whole that held it tells instead, with no hiding", () => {
        const { setup, whole, a } = holder()
        const part = Detail.on(a, "A")
        const heard = heardFrom(Detail.on(whole, "whole", [part]))
        moveTo(setup, 5, 5)
        part.enabled = false
        expect(heard).toEqual(["show A", "show whole"])
    })

    test("a child disabled → the whole tells instead", () => {
        const { setup, whole, a } = holder()
        const part = Detail.on(a, "A")
        const heard = heardFrom(Detail.on(whole, "whole", [part]))
        part.enabled = false
        moveTo(setup, 5, 5)
        expect(heard).toEqual(["show whole"])
    })
})

describe("Detail.remove", () => {
    test("removed → it tells nothing more", () => {
        const { setup, a } = holder()
        const detail = Detail.on(a, "A")
        const heard = heardFrom(detail)
        detail.remove()
        moveTo(setup, 5, 5)
        expect(heard).toEqual([])
    })

    test("removed while shown → the children's changes no longer reach its listeners", () => {
        const { setup, whole, a } = holder()
        const part = Detail.on(a, "A")
        const detail = Detail.on(whole, "whole", [part])
        const heard = heardFrom(detail)
        detail.remove()
        moveTo(setup, 5, 5)
        expect(heard).toEqual([])
    })
})
