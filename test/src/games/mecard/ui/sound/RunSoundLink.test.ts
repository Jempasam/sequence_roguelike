import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { Assets, MemoryAssets, SoundPlayer, SoundSettings } from "@game/core"
import { BATTLE, CHEST_HALT } from "@game/core/mecard"
import type { Place, PlaceType, Run } from "@game/core/mecard"
import { RunSoundLink } from "@game/core/mecard/run-sound-link"
import { FakeAudio } from "../../../../fixtures/fakeAudio"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** The sounds shipped with the game, in a fixed order: a sound is identified by its place in it. */
const SOUNDS_DIRECTORY = join(__dirname, "../../../../../../assets/mecard/sounds")
const FILES = readdirSync(SOUNDS_DIRECTORY).sort()

/** The id a sound is played with on the fake audio. */
const idOf = (file: string): number => {
    const index = FILES.indexOf(file)
    if(index < 0) throw new Error(`No sound named ${file}.`)
    return index
}

/** The real files of the game, their first byte replaced by their id, so what is played says which it is. */
function shippedSounds(): MemoryAssets {
    const files: Record<string, Uint8Array> = {}
    for(const file of FILES){
        const bytes = new Uint8Array(readFileSync(join(SOUNDS_DIRECTORY, file)))
        bytes[0] = idOf(file)
        files[`mecard/sounds/${file}`] = bytes
    }
    return new MemoryAssets(files)
}

/** A link on a run, and what it plays. */
function linkOf(run: Run): { link: RunSoundLink, audio: FakeAudio, reports: string[] } {
    const audio = new FakeAudio()
    const reports: string[] = []
    const assets = new Assets(shippedSounds())
    const player = new SoundPlayer(new SoundSettings(), audio, assets, text => reports.push(text))
    return { link: new RunSoundLink(run, player), audio, reports }
}

/** Let the loads and decodes the player started settle. */
function settle(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
}

/** A new place of a sort, on no map. */
function placeOf(type: PlaceType): Place {
    return { type, layer: 1, across: 0.5, next: [], exitTo: null, monsters: [] }
}

/** Reach a fight, to be fought by the run. */
function reachFight(run: Run): void {
    const place = placeOf(BATTLE)
    run.travel.jump(place)
    run.travel.journey.link(place, place)
    run.travel.go(place)
    run.travel.enter()
}

/** The files the fake audio played, in order. */
function heard(audio: FakeAudio): string[] {
    return audio.played.map(played => FILES[played.id])
}

// --- Tests ---

describe("RunSoundLink, the journey", () => {
    test("a visit opened, then left → a note, then a deep one", async() => {
        const run = startedRun(1)
        const { audio } = linkOf(run)
        run.travel.visit(CHEST_HALT)
        await settle()
        run.travel.leave()
        await settle()
        expect(heard(audio)).toEqual(["guitare.ogg", "guitare_grave.ogg"])
    })

    test("a fight fought, then left → the blows of a sword, then a deep note", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio } = linkOf(run)
        run.startBattle()
        await settle()
        run.backToMap()
        await settle()
        expect(heard(audio)).toEqual(["sword.wav", "guitare_grave.ogg"])
    })

    test("a step of the party → its sound", async() => {
        const run = startedRun(1)
        const { audio } = linkOf(run)
        run.travel.go(run.travel.next[0])
        await settle()
        expect(heard(audio)).toEqual(["tchi.wav"])
    })

    test("every sound the link plays → a file of the game, loaded without a report", async() => {
        const run = startedRun(1)
        const { audio, reports } = linkOf(run)
        reachFight(run)
        run.startBattle()
        const { signals } = run.battle!
        signals.drawn.notify({} as never)
        signals.cardActivated.notify({} as never)
        signals.moved.notify({} as never)
        signals.damaged.notify({} as never)
        signals.healed.notify({} as never)
        signals.statusAdded.notify({} as never)
        signals.spawned.notify({} as never)
        signals.died.notify({} as never)
        run.battle!.roundStarted.notify(1)
        run.battle!.onGetGold.notify({} as never)
        await settle()
        expect(reports).toEqual([])
        expect(new Set(heard(audio))).toEqual(new Set([
            "sword.wav", "card.wav", "click.wav", "tchi.wav", "declick.wav", "pop.wav", "frinch.wav", "dragon.wav",
            "top.wav",
        ]))
    })
})

describe("RunSoundLink, letting go", () => {
    test("disposed → nothing is played", async() => {
        const run = startedRun(1)
        const { link, audio } = linkOf(run)
        link.dispose()
        run.travel.visit(CHEST_HALT)
        run.travel.leave()
        reachFight(run)
        run.startBattle()
        await settle()
        expect(audio.played).toEqual([])
    })

    test("another run → heard from then on, the first one no more", async() => {
        const first = startedRun(1)
        const second = startedRun(2)
        const { link, audio } = linkOf(first)
        link.engine = second
        first.travel.visit(CHEST_HALT)
        await settle()
        expect(audio.played).toEqual([])
        second.travel.visit(CHEST_HALT)
        await settle()
        expect(heard(audio)).toEqual(["guitare.ogg"])
    })

    test("a next battle → the first one is no more heard", async() => {
        const run = startedRun(1)
        const { audio } = linkOf(run)
        run.startBattle()
        const first = run.battle!
        run.backToMap()
        run.startBattle()
        await settle()
        const before = audio.played.length
        first.roundStarted.notify(1)
        await settle()
        expect(audio.played.length).toBe(before)
        run.battle!.roundStarted.notify(1)
        await settle()
        expect(audio.played.length).toBe(before + 1)
    })
})
