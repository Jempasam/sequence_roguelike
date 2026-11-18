import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { Assets, MemoryAssets, SoundPlayer, SoundSettings } from "@game/core"
import { BATTLE, BOSS, CHEST_HALT, ELITE, GOBLIN } from "@game/core/mecard"
import type { FightCategory, HaltType, Place, PlaceType, Run } from "@game/core/mecard"
import { RunSoundLink } from "@game/core/mecard/run-sound-link"
import { FakeAudio } from "../../../../fixtures/fakeAudio"
import { fightOf } from "../../../../fixtures/fightFixtures"
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
    const where = { layer: 1, across: 0.5, next: [], exitTo: null }
    return [BATTLE, ELITE, BOSS].includes(type as FightCategory)
        ? { ...where, fight: fightOf(type as FightCategory, GOBLIN), halt: null }
        : { ...where, fight: null, halt: type as HaltType }
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
})
