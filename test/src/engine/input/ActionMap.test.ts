import { describe, expect, test } from "vitest"
import {
    ActionMap, buttons, gamepad, InputSystem, key, KEYBOARD, keys, mouse, MOUSE, pad, REPEAT_DELAY,
    REPEAT_INTERVAL, stick, STICK_DEADZONE,
} from "@game/core"
import type { ActionBindings } from "@game/core"

import { FakeInput } from "../../fixtures/fakeInput"

// --- Fixture builders ---

const FRAME = 1 / 60

const GAMEPLAY = {
    buttons: {
        attack: [key("KeyJ"), mouse(0), pad("west")],
        dodge: [key("Space"), pad("south")],
    },
    axes: {
        move: [keys("KeyW", "KeyS", "KeyA", "KeyD"), stick("left")],
    },
} satisfies ActionBindings<string, string>

function system(): { port: FakeInput, input: InputSystem } {
    const port = new FakeInput()
    return { port, input: new InputSystem(port) }
}

function gameplay(options?: ConstructorParameters<typeof ActionMap>[1]): ActionMap<"attack"|"dodge", "move"> {
    return new ActionMap(GAMEPLAY, options)
}

// --- Tests ---

describe("ActionMap.update", () => {
    test("press → held, release → not held", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ")
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(true)
        port.keyUp("KeyJ")
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(false)
    })

    test("two bindings held, one released → still held", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ").mouseDown(0)
        map.update(input.beginFrame(FRAME))
        port.keyUp("KeyJ")
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(true)
        port.mouseUp(0)
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(false)
    })

    test("press consumed → not held until released and pressed again", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("Space")
        const frame = input.beginFrame(FRAME)
        frame.consume(frame.events[0])
        map.update(frame)
        expect(map.held("dodge")).toBe(false)
        map.update(input.beginFrame(FRAME))
        expect(map.held("dodge")).toBe(false)
        port.keyUp("Space").keyDown("Space")
        map.update(input.beginFrame(FRAME))
        expect(map.held("dodge")).toBe(true)
    })

    test("key typed in a text field → no move", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyW")
        const frame = input.beginFrame(FRAME)
        frame.consume(frame.events[0])
        map.update(frame)
        expect(map.axis("move")).toEqual({ x: 0, y: 0 })
    })

    test("release consumed → still releases", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ")
        map.update(input.beginFrame(FRAME))
        port.keyUp("KeyJ")
        const frame = input.beginFrame(FRAME)
        frame.consume(frame.events[0])
        map.update(frame)
        expect(map.held("attack")).toBe(false)
    })

    test("focus-lost → released", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ").keyDown("KeyD")
        map.update(input.beginFrame(FRAME))
        port.send({ type: "focus-lost" })
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(false)
        expect(map.axis("move")).toEqual({ x: 0, y: 0 })
    })

    test("pad unplugged → released", () => {
        const { port, input } = system()
        const map = gameplay()
        port.setPad(0, ["west"])
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(true)
        port.unplug(0)
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(false)
    })
})

describe("ActionMap.enabled", () => {
    test("disabled → everything released", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ").keyDown("KeyD")
        map.update(input.beginFrame(FRAME))
        map.enabled = false
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(false)
        expect(map.axis("move")).toEqual({ x: 0, y: 0 })
        expect(map.sample().released("attack")).toBe(true)
    })

    test("button held at enabling → not held until pressed again", () => {
        const { port, input } = system()
        const map = gameplay()
        map.enabled = false
        port.keyDown("KeyJ")
        map.update(input.beginFrame(FRAME))
        map.enabled = true
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(false)
        port.keyUp("KeyJ").keyDown("KeyJ")
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(true)
    })

    test("axis held at enabling → applies at once", () => {
        const { port, input } = system()
        const map = gameplay()
        map.enabled = false
        port.keyDown("KeyD")
        map.update(input.beginFrame(FRAME))
        map.enabled = true
        map.update(input.beginFrame(FRAME))
        expect(map.axis("move")).toEqual({ x: 1, y: 0 })
    })
})

describe("ActionMap.sample", () => {
    test("pressed, then sampled → pressed and held", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ")
        map.update(input.beginFrame(FRAME))
        const sample = map.sample()
        expect([sample.held("attack"), sample.pressed("attack"), sample.released("attack")]).toEqual([true, true, false])
    })

    test("two ticks in a frame → only the first sees the press", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ")
        map.update(input.beginFrame(FRAME))
        expect(map.sample().pressed("attack")).toBe(true)
        expect(map.sample().pressed("attack")).toBe(false)
    })

    test("no tick in a frame → the press waits for the next tick", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ")
        map.update(input.beginFrame(FRAME))
        map.update(input.beginFrame(FRAME))
        expect(map.sample().pressed("attack")).toBe(true)
    })

    test("pressed and released in one frame → both seen, not held", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyJ").keyUp("KeyJ")
        map.update(input.beginFrame(FRAME))
        const sample = map.sample()
        expect([sample.held("attack"), sample.pressed("attack"), sample.released("attack")]).toEqual([false, true, true])
    })

    test("axis → its value now", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyS")
        map.update(input.beginFrame(FRAME))
        expect(map.sample().axis("move")).toEqual({ x: 0, y: 1 })
    })
})

describe("ActionMap.axis", () => {
    test("diagonal of keys → length 1", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyW").keyDown("KeyD")
        map.update(input.beginFrame(FRAME))
        const { x, y } = map.axis("move")
        expect(x).toBeCloseTo(Math.SQRT1_2)
        expect(y).toBeCloseTo(-Math.SQRT1_2)
    })

    test("opposite keys → cancel out", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyA").keyDown("KeyD")
        map.update(input.beginFrame(FRAME))
        expect(map.axis("move")).toEqual({ x: 0, y: 0 })
    })

    test("stick inside the dead zone → 0", () => {
        const { port, input } = system()
        const map = gameplay()
        port.setPad(0, [], { leftX: STICK_DEADZONE * 0.9 })
        map.update(input.beginFrame(FRAME))
        expect(map.axis("move")).toEqual({ x: 0, y: 0 })
    })

    test("stick past the dead zone → rescaled from its edge", () => {
        const { port, input } = system()
        const map = gameplay()
        const halfway = STICK_DEADZONE + (1 - STICK_DEADZONE) / 2
        port.setPad(0, [], { leftX: halfway })
        map.update(input.beginFrame(FRAME))
        expect(map.axis("move").x).toBeCloseTo(0.5)
    })

    test("stick past 1 → length 1", () => {
        const { port, input } = system()
        const map = gameplay()
        port.setPad(0, [], { leftX: 1, leftY: 1 })
        map.update(input.beginFrame(FRAME))
        const { x, y } = map.axis("move")
        expect(Math.hypot(x, y)).toBeCloseTo(1)
    })

    test("keys and stick → the longest", () => {
        const { port, input } = system()
        const map = gameplay()
        port.keyDown("KeyD").setPad(0, [], { leftY: 0.5 })
        map.update(input.beginFrame(FRAME))
        expect(map.axis("move")).toEqual({ x: 1, y: 0 })
    })

    test("cross of a gamepad as four buttons → an axis", () => {
        const { port, input } = system()
        const map = new ActionMap({
            buttons: {},
            axes: { move: [buttons(pad("up"), pad("down"), pad("left"), pad("right"))] },
        })
        port.setPad(0, ["left"])
        map.update(input.beginFrame(FRAME))
        expect(map.axis("move")).toEqual({ x: -1, y: 0 })
    })
})

describe("ActionMap.occurrences", () => {
    function navigation(): ActionMap<"down"|"accept", never> {
        return new ActionMap({ buttons: { down: [key("ArrowDown"), pad("down")], accept: [key("Enter")] }, axes: {} })
    }

    test("press → one occurrence with its event", () => {
        const { port, input } = system()
        const map = navigation()
        port.keyDown("ArrowDown").keyDown("Enter")
        const frame = input.beginFrame(FRAME)
        map.update(frame)
        expect(map.occurrences.map(occurrence => occurrence.action)).toEqual(["down", "accept"])
        expect(map.occurrences[0].event).toBe(frame.events[0])
    })

    test("held → repeats after the delay, then at each interval", () => {
        const { port, input } = system()
        const map = navigation()
        port.keyDown("ArrowDown")
        map.update(input.beginFrame(FRAME))
        map.update(input.beginFrame(REPEAT_DELAY - 2 * FRAME))
        expect(map.occurrences).toEqual([])
        map.update(input.beginFrame(2 * FRAME))
        expect(map.occurrences.map(occurrence => [occurrence.action, occurrence.event])).toEqual([["down", null]])
        map.update(input.beginFrame(REPEAT_INTERVAL / 2))
        expect(map.occurrences).toEqual([])
        // A little past the interval, since the sum of the frames is not exact in floating point.
        map.update(input.beginFrame(REPEAT_INTERVAL * 0.6))
        expect(map.occurrences.length).toBe(1)
    })

    test("released → repeats no more", () => {
        const { port, input } = system()
        const map = navigation()
        port.keyDown("ArrowDown")
        map.update(input.beginFrame(FRAME))
        port.keyUp("ArrowDown")
        map.update(input.beginFrame(FRAME))
        map.update(input.beginFrame(REPEAT_DELAY))
        expect(map.occurrences).toEqual([])
    })

    test("cross of a gamepad held → repeats like an arrow key", () => {
        const { port, input } = system()
        const map = navigation()
        port.setPad(0, ["down"])
        map.update(input.beginFrame(FRAME))
        map.update(input.beginFrame(REPEAT_DELAY))
        expect(map.occurrences.map(occurrence => occurrence.action)).toEqual(["down"])
    })

    test("occurrence consumed → the next table does not see the press", () => {
        const { port, input } = system()
        const ui = navigation()
        const map = gameplay()
        port.keyDown("Enter").keyDown("KeyJ")
        const frame = input.beginFrame(FRAME)
        ui.update(frame)
        ui.occurrences[0].consume()
        map.update(frame)
        expect(frame.events[0].consumed).toBe(true)
        expect(map.held("attack")).toBe(true)
    })
})

describe("ActionMap.bindings", () => {
    test("setBindings → the new ones apply, the old ones do not", () => {
        const { port, input } = system()
        const map = gameplay()
        const saved = map.bindings()
        map.setBindings({ ...saved, buttons: { ...saved.buttons, attack: [key("KeyK")] } })
        port.keyDown("KeyJ").keyDown("KeyK")
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(true)
        expect(map.bindings().buttons.attack).toEqual([key("KeyK")])
    })

    test("bindings → survive JSON", () => {
        const map = gameplay()
        const copy = gameplay()
        copy.setBindings(JSON.parse(JSON.stringify(map.bindings())))
        expect(copy.bindings()).toEqual(map.bindings())
    })

    test("other actions → throws", () => {
        const map = gameplay()
        expect(() => map.setBindings({ buttons: { attack: [] }, axes: {} } as never)).toThrow(/actions/)
    })

    test("malformed binding → throws, naming the action", () => {
        const map = gameplay()
        const saved = map.bindings()
        const broken = { ...saved, buttons: { ...saved.buttons, dodge: [{ kind: "pad", control: "jump" }] } }
        expect(() => map.setBindings(broken as never)).toThrow(/dodge/)
    })

    test("name both a button and an axis → throws", () => {
        expect(() => new ActionMap({ buttons: { move: [] }, axes: { move: [] } })).toThrow(/both/)
    })

    test("bindingFor → the binding of the device in use", () => {
        const map = gameplay()
        expect(map.bindingFor("attack", gamepad(3))).toEqual(pad("west"))
        expect(map.bindingFor("attack", MOUSE)).toEqual(mouse(0))
        expect(map.bindingFor("move", KEYBOARD)).toEqual(keys("KeyW", "KeyS", "KeyA", "KeyD"))
        expect(map.bindingFor("attack", null)).toEqual(key("KeyJ"))
    })

    test("keyLabel → the name the port gives", () => {
        const { port, input } = system()
        port.labels.set("KeyW", "Z")
        expect(input.keyLabel("KeyW")).toBe("Z")
        expect(input.keyLabel("KeyQ")).toBeNull()
    })
})

describe("ActionMap.devices", () => {
    test("two gamepads, two tables → each sees its own", () => {
        const { port, input } = system()
        const player1 = gameplay({ devices: [gamepad(1)] })
        const player2 = gameplay({ devices: [gamepad(2)] })
        port.setPad(1, ["west"]).setPad(2, [], { leftX: 1 })
        const frame = input.beginFrame(FRAME)
        player1.update(frame)
        player2.update(frame)
        expect([player1.held("attack"), player2.held("attack")]).toEqual([true, false])
        expect([player1.axis("move").x, player2.axis("move").x]).toEqual([0, 1])
        expect(player1.lastDevice).toEqual(gamepad(1))
        expect(player2.lastDevice).toEqual(gamepad(2))
    })

    test("gamepad unplugged → releases its own table only", () => {
        const { port, input } = system()
        const player1 = gameplay({ devices: [gamepad(1)] })
        const player2 = gameplay({ devices: [gamepad(2)] })
        port.setPad(1, ["west"]).setPad(2, ["west"])
        let frame = input.beginFrame(FRAME)
        player1.update(frame)
        player2.update(frame)
        port.unplug(1)
        frame = input.beginFrame(FRAME)
        player1.update(frame)
        player2.update(frame)
        expect([player1.held("attack"), player2.held("attack")]).toEqual([false, true])
    })

    test("two tables on one keyboard → each sees its keys", () => {
        const { port, input } = system()
        const left = new ActionMap({ buttons: {}, axes: { move: [keys("KeyW", "KeyS", "KeyA", "KeyD")] } })
        const right = new ActionMap({
            buttons: {},
            axes: { move: [keys("ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight")] },
        })
        port.keyDown("KeyD").keyDown("ArrowUp")
        const frame = input.beginFrame(FRAME)
        left.update(frame)
        right.update(frame)
        expect(left.axis("move")).toEqual({ x: 1, y: 0 })
        expect(right.axis("move")).toEqual({ x: 0, y: -1 })
    })

    test("keyboard table → no gamepad", () => {
        const { port, input } = system()
        const map = gameplay({ devices: [KEYBOARD, MOUSE] })
        port.setPad(0, ["west"], { leftX: 1 })
        map.update(input.beginFrame(FRAME))
        expect(map.held("attack")).toBe(false)
        expect(map.axis("move")).toEqual({ x: 0, y: 0 })
        expect(map.lastDevice).toBeNull()
    })
})
