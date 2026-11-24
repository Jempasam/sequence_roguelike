import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { Assets, MemoryAssets, SoundPlayer, SoundSettings } from "@game/core"
import type { TimerPort } from "@game/core"
import { BATTLE, BOSS, CHEST_HALT, ELITE, GOBLIN, Rng } from "@game/core/mecard"
import type { FightCategory, HaltType, Observable, Place, PlaceType, Run } from "@game/core/mecard"
import { RunSoundLink } from "@game/core/mecard/run-sound-link"
import { Forwarded } from "@game/core/mecard/forwarded"
import {
    ACTION_VOICE_VOLUME, BATTLE_VOICE_DELAY, ROUND_VOICE_VOLUME, SPAWN_VOICE_VOLUME, voiceOf,
} from "@game/core/mecard/unit-sounds"
import { FakeAudio } from "../../../../fixtures/fakeAudio"
import { ManualTimer } from "../../../../fixtures/manualTimer"
import { fightOf } from "../../../../fixtures/fightFixtures"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** The sounds shipped with the game, in a fixed order: a sound is identified by its place in it. */
const ROOT_DIRECTORY = join(__dirname, "../../../../../..")
const SOUNDS_DIRECTORIES = ["assets", "generated_assets"].map(root => join(ROOT_DIRECTORY, root, "mecard/sounds"))
const FULL_PATHS = new Map(SOUNDS_DIRECTORIES.flatMap(directory => (
    readdirSync(directory, { recursive: true, encoding: "utf8" })
        .map(file => [file.replaceAll("\\", "/"), join(directory, file)] as const)
        .filter(([, full]) => statSync(full).isFile())
)))
const FILES = [...FULL_PATHS.keys()].sort()

/** The id a sound is played with on the fake audio. */
const idOf = (file: string): number => {
    const index = FILES.indexOf(file)
    if(index < 0) throw new Error(`No sound named ${file}.`)
    return index
}

/** The real files of the game, their first bytes replaced by their id, so what is played says which it is. */
function shippedSounds(): MemoryAssets {
    const files: Record<string, Uint8Array> = {}
    for(const file of FILES){
        const bytes = new Uint8Array(readFileSync(FULL_PATHS.get(file)!))
        bytes[0] = idOf(file) % 256
        bytes[1] = Math.floor(idOf(file) / 256)
        files[`mecard/sounds/${file}`] = bytes
    }
    return new MemoryAssets(files)
}

/** A screen that plays at once: what the journey tells is forwarded as it is told. */
function playAtOnce(run: Run, forwarded: Forwarded): void {
    const { travel } = run
    const forwardAll = <Event>(observable: Observable<Event>): void => {
        observable.add(value => forwarded.forward(observable, value, "start"))
    }
    forwardAll(travel.visitStarted)
    forwardAll(travel.haltImpacted)
    forwardAll(travel.visitEnded)
    forwardAll(travel.fightEntered)
    forwardAll(travel.fightLeft)
    forwardAll(travel.moved)
}

/** A link on a run, and what it plays. */
function linkOf(
    run: Run, voices?: Rng, timer: TimerPort = new ManualTimer(),
): { link: RunSoundLink, audio: FakeAudio, reports: string[], forwarded: Forwarded } {
    const audio = new FakeAudio()
    const reports: string[] = []
    const assets = new Assets(shippedSounds())
    const player = new SoundPlayer(new SoundSettings(), audio, assets, text => reports.push(text), timer)
    const forwarded = new Forwarded(error => reports.push(String(error)))
    playAtOnce(run, forwarded)
    return { link: new RunSoundLink(run, player, forwarded, voices), audio, reports, forwarded }
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

/** Every file the fake audio played, in order. */
function heardAll(audio: FakeAudio): string[] {
    return audio.played.map(played => FILES[played.id])
}

/** The files the fake audio played but the voices of the units, in order. */
function heard(audio: FakeAudio): string[] {
    return heardAll(audio).filter(file => !file.startsWith("unit/"))
}

/** The voices of the units the fake audio played, in order. */
function voices(audio: FakeAudio): string[] {
    return heardAll(audio).filter(file => file.startsWith("unit/"))
}

/** A random source in which every chance happens. */
class Always extends Rng {
    public override chance(): boolean { return true }
}

/** A random source in which no chance happens. */
class Never extends Rng {
    public override chance(): boolean { return false }
}

// --- Tests ---

describe("RunSoundLink, the journey", () => {
    test("a visit opened, then left → the sound of its halt, then a deep note", async() => {
        const run = startedRun(1)
        const { audio } = linkOf(run)
        run.travel.visit(CHEST_HALT)
        await settle()
        run.travel.leave()
        await settle()
        expect(heard(audio)).toEqual(["halt/chest.ogg", "guitare_grave.ogg"])
    })

    test("a halt changing the run, twice → its entrance sound once, then its impact sound twice", async() => {
        const run = startedRun(1)
        const { audio } = linkOf(run)
        run.travel.visit(CHEST_HALT)
        run.travel.haltImpacted.notify(run.travel.halt!)
        run.travel.haltImpacted.notify(run.travel.halt!)
        await settle()
        expect(heard(audio)).toEqual(["halt/chest.ogg", "halt_impacts/chest.ogg", "halt_impacts/chest.ogg"])
    })

    test("a fight fought, then left → the sound of its category, then a deep note", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio } = linkOf(run)
        run.startBattle()
        await settle()
        run.backToMap()
        await settle()
        expect(heard(audio)).toEqual(["fights/battle.ogg", "guitare_grave.ogg"])
    })

    test("a step of the party → its sound", async() => {
        const run = startedRun(1)
        const { audio } = linkOf(run)
        run.travel.go(run.travel.next[0])
        await settle()
        expect(heard(audio)).toEqual(["tchi.wav"])
    })

})

describe("RunSoundLink, the battle", () => {
    test("a unit blinks → the blink sound, not the step", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio, forwarded } = linkOf(run)
        run.startBattle()
        await settle()
        const { blinked } = run.battle!.signals
        forwarded.forward(blinked, {} as never, "start")
        await settle()
        expect(heard(audio)).toEqual(["fights/battle.ogg", "blink.ogg"])
    })

    test.each([
        [1, "hit2.ogg"], [2, "hit2.ogg"], [3, "hit4.ogg"], [4, "hit4.ogg"],
        [5, "hit8.ogg"], [8, "hit8.ogg"], [9, "hit12.ogg"], [20, "hit12.ogg"],
    ])("a blow of %i hearts → the sound %s", async(amount, file) => {
        const run = startedRun(1)
        reachFight(run)
        const { audio, forwarded } = linkOf(run)
        run.startBattle()
        await settle()
        const { damaged } = run.battle!.signals
        forwarded.forward(damaged, { amount } as never, "start")
        await settle()
        expect(heard(audio)).toEqual(["fights/battle.ogg", file])
    })
})

describe("RunSoundLink, the voices of the units", () => {
    test("a battle starts → the sound of its fight, then 2 seconds later the voice of one of its units", async() => {
        const run = startedRun(1)
        reachFight(run)
        const timer = new ManualTimer()
        const { audio } = linkOf(run, new Never(1), timer)
        run.startBattle()
        await settle()
        expect(heardAll(audio)).toEqual(["fights/battle.ogg"])
        timer.advance(BATTLE_VOICE_DELAY - 1)
        await settle()
        expect(voices(audio)).toEqual([])
        timer.advance(1)
        await settle()
        expect(voices(audio)).toHaveLength(1)
        expect(voices(audio)[0]).toMatch(/^unit\/.+\.ogg$/)
    })

    test("a card played → the slap of the card, whatever the chance", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio, forwarded } = linkOf(run, new Never(1))
        run.startBattle()
        await settle()
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.signals.cardActivated, { unit } as never, "start")
        await settle()
        expect(heardAll(audio)).toEqual(["fights/battle.ogg", "card_play.ogg"])
    })

    test("a card played, the chance of a voice happening → the slap and, as light, the voice of its unit", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio, forwarded } = linkOf(run, new Always(1))
        run.startBattle()
        await settle()
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.signals.cardActivated, { unit } as never, "start")
        await settle()
        const [slap, voice] = audio.played.slice(-2)
        expect(FILES[slap.id]).toBe("card_play.ogg")
        expect(FILES[voice.id]).toMatch(/^unit\/.+\.ogg$/)
        expect(voice.volume / slap.volume).toBeCloseTo(ACTION_VOICE_VOLUME)
    })

    test("a round starts → its sound, then, half as loud, the voice of the first unit alive to play", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio, forwarded } = linkOf(run, new Never(1))
        run.startBattle()
        await settle()
        const { battle } = run
        battle!.startRound()
        const first = battle!.initiative.find(unit => unit.alive)!
        battle!.initiative = []
        forwarded.forward(battle!.roundStarted, 1, "start")
        await settle()
        const [round, voice] = audio.played.slice(-2)
        expect(FILES[round.id]).toBe("round_start.ogg")
        expect(FILES[voice.id]).toBe(voiceOf(first.sprite).path.replace("mecard/sounds/", ""))
        expect(voice.volume / round.volume).toBeCloseTo(ROUND_VOICE_VOLUME)
    })

    test("a unit enters the battle → the sound of its coming, then, half as loud, its voice", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio, forwarded } = linkOf(run, new Never(1))
        run.startBattle()
        await settle()
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.signals.spawned, { unit } as never, "start")
        await settle()
        const [coming, voice] = audio.played.slice(-2)
        expect(FILES[coming.id]).toBe("spawn.ogg")
        expect(FILES[voice.id]).toBe(voiceOf(unit.sprite).path.replace("mecard/sounds/", ""))
        expect(voice.volume / coming.volume).toBeCloseTo(SPAWN_VOICE_VOLUME)
    })

    test("a hazard enters the battle → the sound of its coming only", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio, forwarded } = linkOf(run, new Never(1))
        run.startBattle()
        await settle()
        const hazard = { sprite: run.battle!.units[0].sprite, tangible: false }
        forwarded.forward(run.battle!.signals.spawned, { unit: hazard } as never, "start")
        await settle()
        expect(heardAll(audio)).toEqual(["fights/battle.ogg", "spawn.ogg"])
    })

    test("a unit dies → the sound of its death, then its voice", async() => {
        const run = startedRun(1)
        reachFight(run)
        const { audio, forwarded } = linkOf(run, new Never(1))
        run.startBattle()
        await settle()
        const [unit] = run.battle!.units
        forwarded.forward(run.battle!.signals.died, { unit } as never, "start")
        await settle()
        expect(heardAll(audio).slice(-2)).toEqual([
            "death.ogg", voiceOf(unit.sprite).path.replace("mecard/sounds/", ""),
        ])
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
        const { link, audio, forwarded } = linkOf(first)
        playAtOnce(second, forwarded)
        link.engine = second
        first.travel.visit(CHEST_HALT)
        await settle()
        expect(audio.played).toEqual([])
        second.travel.visit(CHEST_HALT)
        second.travel.haltImpacted.notify(second.travel.halt!)
        await settle()
        expect(heard(audio)).toEqual(["halt/chest.ogg", "halt_impacts/chest.ogg"])
    })
})
