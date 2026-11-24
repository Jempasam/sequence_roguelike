import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { Assets, Button, Choice, MemoryAssets, SoundPlayer, SoundSettings } from "@game/core"
import { UiSoundLink } from "@game/core/mecard/ui-sound-link"
import { FakeAudio } from "../../../../fixtures/fakeAudio"
import { Probe, uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** The sounds shipped with the game, in a fixed order: a sound is identified by its place in it. */
const SOUNDS_DIRECTORY = join(__dirname, "../../../../../../assets/mecard/sounds")
const FILES = readdirSync(SOUNDS_DIRECTORY).sort()

/** The real files of the game, their first bytes replaced by their id, so what is played says which it is. */
function shippedSounds(): MemoryAssets {
    const files: Record<string, Uint8Array> = {}
    FILES.forEach((file, id) => {
        const bytes = new Uint8Array(readFileSync(join(SOUNDS_DIRECTORY, file)))
        bytes[0] = id
        bytes[1] = 0
        files[`mecard/sounds/${file}`] = bytes
    })
    return new MemoryAssets(files)
}

/** An interface with a button in it and a link on it, and what it plays. */
function linkedButton(options: { enabled?: boolean } = {}): {
    setup: UiSetup, button: Button, link: UiSoundLink, audio: FakeAudio, reports: string[]
} {
    const setup = uiSetup()
    const button = new Button(setup.theme, "Go", options)
    setup.main.content.add(button, { offsetX: 10, offsetY: 10 })
    setup.ui.render()
    const audio = new FakeAudio()
    const reports: string[] = []
    const player = new SoundPlayer(new SoundSettings(), audio, new Assets(shippedSounds()), text => reports.push(text))
    return { setup, button, link: new UiSoundLink(setup.ui, player), audio, reports }
}

/** Let the loads and decodes the player started settle. */
function settle(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
}

/** The files the fake audio played, in order. */
function heard(audio: FakeAudio): string[] {
    return audio.played.map(played => FILES[played.id])
}

/** Come over the button, then press and release it. */
function click(setup: UiSetup, x = 15, y = 12): void {
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    setup.frame()
}

// --- Tests ---

describe("UiSoundLink", () => {
    test("a button clicked → the hover sound as the pointer comes, a click, then a softer one for the release", async() => {
        const { setup, audio, reports } = linkedButton()
        click(setup)
        await settle()
        expect(heard(audio)).toEqual(["card_hover.wav", "click.wav", "declick.wav"])
        expect(reports).toEqual([])
    })

    test("the pointer coming over a button, then leaving it → the hover sound only", async() => {
        const { setup, audio } = linkedButton()
        setup.port.send({ type: "pointer-move", x: 15, y: 12 })
        setup.frame()
        setup.port.send({ type: "pointer-move", x: 200, y: 150 })
        setup.frame()
        await settle()
        expect(heard(audio)).toEqual(["card_hover.wav"])
    })

    test("the pointer coming over an option of a choice, clicking it, leaving it → the hover, the click and its release, nothing on leaving", async() => {
        const { setup, audio } = linkedButton()
        const choice = new Choice(
            setup.theme,
            picks => picks.length < 1 ? { title: null, options: [new Probe("o", [20, 10], { interactive: true })] } : null,
            () => {},
        )
        setup.main.content.add(choice, { offsetX: 100, offsetY: 100 })
        setup.ui.render()
        setup.port.send({ type: "pointer-move", x: 105, y: 105 })
        setup.frame()
        await settle()
        expect(heard(audio)).toEqual(["card_hover.wav"])
        setup.port.send({ type: "pointer-down", button: 0, x: 105, y: 105 })
        setup.port.send({ type: "pointer-up", button: 0, x: 105, y: 105 })
        setup.frame()
        await settle()
        expect(heard(audio)).toEqual(["card_hover.wav", "click.wav", "declick.wav"])
        setup.port.send({ type: "pointer-move", x: 250, y: 160 })
        setup.frame()
        await settle()
        expect(heard(audio)).toEqual(["card_hover.wav", "click.wav", "declick.wav"])
    })

    test("a button disabled → nothing", async() => {
        const { setup, audio } = linkedButton({ enabled: false })
        click(setup)
        await settle()
        expect(audio.played).toEqual([])
    })

    test("an interactive component that is no button → nothing", async() => {
        const { setup, audio } = linkedButton()
        setup.main.content.add(new Probe("p", [20, 20], { interactive: true }), { offsetX: 100, offsetY: 100 })
        setup.ui.render()
        click(setup, 105, 102)
        await settle()
        expect(audio.played).toEqual([])
    })

    test("the other buttons of the pointer → no click, only the hover", async() => {
        const { setup, audio } = linkedButton()
        setup.port.send({ type: "pointer-move", x: 15, y: 12 }, { type: "pointer-down", button: 2, x: 15, y: 12 })
        setup.port.send({ type: "pointer-up", button: 2, x: 15, y: 12 })
        setup.frame()
        await settle()
        expect(heard(audio)).toEqual(["card_hover.wav"])
    })

    test("disposed → nothing is played", async() => {
        const { setup, link, audio } = linkedButton()
        link.dispose()
        click(setup)
        await settle()
        expect(audio.played).toEqual([])
    })
})
