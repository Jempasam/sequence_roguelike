import { describe, expect, test } from "vitest"
import {
    ActionMap, gamepad, InputSystem, key, KEYBOARD, keys, mouse, MOUSE, pad, stick,
} from "@game/core"
import type { ActionBindings, InputFrame } from "@game/core"

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

/** The types of the events of a frame, with what each is about. */
function eventsOf(frame: InputFrame): string[] {
    return frame.events.map(event => {
        const about = event.code || event.control || event.side || (event.button >= 0 ? event.button : "")
        return `${event.type}${about === "" ? "" : ` ${about}`}${event.device.kind === "gamepad" ? ` #${event.device.id}` : ""}`
    })
}

// --- Tests ---

describe("InputSystem.beginFrame", () => {
    test("key repeated while held → a key-repeat, no press of its action", () => {
        const { port, input } = system()
        const world = gameplay()
        port.keyDown("KeyJ")
        world.update(input.beginFrame(FRAME))
        port.send({ type: "key-repeat", code: "KeyJ" })
        const frame = input.beginFrame(FRAME)
        world.update(frame)
        expect(eventsOf(frame)).toEqual(["key-repeat KeyJ"])
        expect(world.occurrences).toEqual([])
    })

    test("key repeated once released → nothing", () => {
        const { port, input } = system()
        port.keyDown("KeyJ").keyUp("KeyJ")
        input.beginFrame(FRAME)
        port.send({ type: "key-repeat", code: "KeyJ" })
        expect(eventsOf(input.beginFrame(FRAME))).toEqual([])
    })

    test("port events → in order, from their device", () => {
        const { port, input } = system()
        port.keyDown("KeyW").send({ type: "pointer-move", x: 3, y: 4 }).send({ type: "text", text: "z" })
        const frame = input.beginFrame(FRAME)
        expect(eventsOf(frame)).toEqual(["key-down KeyW", "pointer-move", "text"])
        expect(frame.events.map(event => event.device)).toEqual([KEYBOARD, MOUSE, KEYBOARD])
        expect([frame.pointerX, frame.pointerY]).toEqual([3, 4])
        expect(frame.isKeyHeld("KeyW")).toBe(true)
    })

    test("key pressed twice → one press", () => {
        const { port, input } = system()
        port.keyDown("KeyW").keyDown("KeyW")
        expect(eventsOf(input.beginFrame(FRAME))).toEqual(["key-down KeyW"])
    })

    test("pad button pressed, then released → pad-down, then pad-up", () => {
        const { port, input } = system()
        port.setPad(1)
        input.beginFrame(FRAME)
        port.setPad(1, ["south"])
        expect(eventsOf(input.beginFrame(FRAME))).toEqual(["pad-down south #1"])
        port.setPad(1)
        expect(eventsOf(input.beginFrame(FRAME))).toEqual(["pad-up south #1"])
    })

    test("pad plugged in holding a button → connected, then its press", () => {
        const { port, input } = system()
        port.setPad(2, ["start"])
        expect(eventsOf(input.beginFrame(FRAME))).toEqual(["pad-connected #2", "pad-down start #2"])
    })

    test("pad unplugged holding a button → its release, then disconnected", () => {
        const { port, input } = system()
        port.setPad(2, ["east"])
        input.beginFrame(FRAME)
        port.unplug(2)
        const frame = input.beginFrame(FRAME)
        expect(eventsOf(frame)).toEqual(["pad-up east #2", "pad-disconnected #2"])
        expect(frame.isPadHeld(2, "east")).toBe(false)
    })

    test("trigger and stick past the threshold → pressed like buttons", () => {
        const { port, input } = system()
        port.setPad(0, [], { r2: 0.9, leftX: -0.8 })
        expect(eventsOf(input.beginFrame(FRAME))).toEqual([
            "pad-connected #0", "pad-down r2 #0", "pad-down leftStickLeft #0", "pad-stick left #0",
        ])
    })

    test("focus-lost → every key and mouse button released, then focus-lost", () => {
        const { port, input } = system()
        port.keyDown("KeyW").mouseDown(2)
        input.beginFrame(FRAME)
        port.send({ type: "focus-lost" })
        const frame = input.beginFrame(FRAME)
        expect(eventsOf(frame)).toEqual(["key-up KeyW", "pointer-up 2", "focus-lost"])
        expect(frame.isKeyHeld("KeyW")).toBe(false)
        port.keyUp("KeyW")
        expect(eventsOf(input.beginFrame(FRAME))).toEqual([])
    })

    test("last device → follows presses, mouse moves and sticks", () => {
        const { port, input } = system()
        expect(input.beginFrame(FRAME).lastDevice).toBeNull()
        port.keyDown("KeyW")
        expect(input.beginFrame(FRAME).lastDevice).toEqual(KEYBOARD)
        port.send({ type: "pointer-move", x: 1, y: 1 })
        expect(input.beginFrame(FRAME).lastDevice).toEqual(MOUSE)
        port.setPad(4, [], { leftY: 0.3 })
        expect(input.beginFrame(FRAME).lastDevice).toEqual(gamepad(4))
        port.keyUp("KeyW")
        expect(input.beginFrame(FRAME).lastDevice).toEqual(gamepad(4))
    })

    test("nothing allocated → the same event objects from frame to frame", () => {
        const { port, input } = system()
        port.keyDown("KeyW")
        const first = input.beginFrame(FRAME).events[0]
        port.keyUp("KeyW")
        expect(input.beginFrame(FRAME).events[0]).toBe(first)
    })
})

describe("InputSystem.capture", () => {
    test("next press → its binding, consumed before anyone", async() => {
        const { port, input } = system()
        const map = gameplay()
        const captured = input.capture()
        port.keyDown("KeyJ")
        const frame = input.beginFrame(FRAME)
        map.update(frame)
        expect(frame.events[0].consumed).toBe(true)
        expect(map.held("attack")).toBe(false)
        expect(await captured).toEqual(key("KeyJ"))
    })

    test("gamepad press → its control", async() => {
        const { port, input } = system()
        const captured = input.capture()
        port.setPad(0, ["north"])
        input.beginFrame(FRAME)
        expect(await captured).toEqual(pad("north"))
    })

    test("escape → none, and consumed", async() => {
        const { port, input } = system()
        const captured = input.capture()
        port.keyDown("Escape")
        expect(input.beginFrame(FRAME).events[0].consumed).toBe(true)
        expect(await captured).toBeNull()
    })

    test("twice → throws", () => {
        const { input } = system()
        void input.capture()
        expect(() => input.capture()).toThrow(/already pending/)
    })

    test("cancelCapture → none", async() => {
        const { input } = system()
        const captured = input.capture()
        input.cancelCapture()
        expect(await captured).toBeNull()
    })
})
