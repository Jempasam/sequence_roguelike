import { describe, expect, test } from "vitest"
import { Assets } from "@game/core-src/engine/assets/Assets"
import { MemoryAssets } from "@game/core-src/engine/assets/MemoryAssets"
import {
    AllPass,
    BandPass,
    HighPass,
    HighShelf,
    LowPass,
    LowShelf,
    Notch,
    Peaking,
} from "@game/core-src/engine/audio/BiquadFilters"
import { Compressor, Delay, Distortion, Gain, Pan, Reverb } from "@game/core-src/engine/audio/Filters"
import { SoundPlayer } from "@game/core-src/engine/audio/SoundPlayer"
import { SoundSettings } from "@game/core-src/engine/audio/SoundSettings"
import { SOUND_SETTINGS_FORMAT } from "@game/core-src/engine/audio/soundSlot"
import type { SoundFilter } from "@game/core-src/engine/audio/SoundFilter"
import { FakeAudio } from "../../fixtures/fakeAudio"
import { ManualTimer } from "../../fixtures/manualTimer"

// --- Fixture builders ---

/** A player on a fake audio, whose sounds are files of one byte: the first holds 1, the second 2. */
function playerOf(): { player: SoundPlayer, audio: FakeAudio, settings: SoundSettings, reports: string[] } {
    const audio = new FakeAudio()
    const settings = new SoundSettings()
    const reports: string[] = []
    const assets = new Assets(new MemoryAssets({
        "mecard/sounds/pop.wav": new Uint8Array([1]),
        "mecard/sounds/top.wav": new Uint8Array([2]),
    }))
    const player = new SoundPlayer(settings, audio, assets, text => reports.push(text))
    return { player, audio, settings, reports }
}

/** Let the loads and decodes the player started settle. */
function settle(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
}

/** The stage a filter asks for. */
function stageOf(filter: SoundFilter): string {
    const audio = new FakeAudio()
    return (filter.build(audio) as { made: string }).made
}

/** A player that has a timer to wait with. */
function timedPlayerOf(): { player: SoundPlayer, audio: FakeAudio, timer: ManualTimer } {
    const audio = new FakeAudio()
    const timer = new ManualTimer()
    const assets = new Assets(new MemoryAssets({ "mecard/sounds/pop.wav": new Uint8Array([1]) }))
    return { player: new SoundPlayer(new SoundSettings(), audio, assets, () => {}, timer), audio, timer }
}

// --- Tests ---

describe("SoundPlayer, delay", () => {
    test("a sound played late, with a timer → heard only once the time has passed", async() => {
        const { player, audio, timer } = timedPlayerOf()
        player.play("effects", "mecard/sounds/pop.wav", { delay: 2000 })
        await settle()
        expect(audio.played).toEqual([])
        timer.advance(1999)
        await settle()
        expect(audio.played).toEqual([])
        timer.advance(1)
        await settle()
        expect(audio.played).toHaveLength(1)
    })

    test("a sound played late, with no timer → heard at once", async() => {
        const { player, audio } = playerOf()
        player.play("effects", "mecard/sounds/pop.wav", { delay: 2000 })
        await settle()
        expect(audio.played).toHaveLength(1)
    })

    test("a sound waiting, the player disposed → never heard", async() => {
        const { player, audio, timer } = timedPlayerOf()
        player.play("effects", "mecard/sounds/pop.wav", { delay: 2000 })
        player.dispose()
        timer.advance(5000)
        await settle()
        expect(audio.played).toEqual([])
        expect(timer.pending).toBe(0)
    })
})

describe("SoundPlayer, volume", () => {
    test("a sound played → master, channel and its own volume multiplied", async() => {
        const { player, audio, settings } = playerOf()
        settings.master = 0.5
        settings.setVolume("effects", 0.5)
        player.play("effects", "mecard/sounds/pop.wav", { volume: 2 })
        await settle()
        expect(audio.played).toEqual([{ id: 1, volume: 0.5, stages: [] }])
    })

    test("a channel nobody set → as loud as the master", async() => {
        const { player, audio, settings } = playerOf()
        settings.master = 0.25
        player.play("music", "mecard/sounds/top.wav")
        await settle()
        expect(audio.played[0].volume).toBe(0.25)
    })

    test("a volume out of range → kept between 0 and 1", () => {
        const { settings } = playerOf()
        settings.master = 3
        settings.setVolume("effects", -1)
        expect(settings.master).toBe(1)
        expect(settings.volumeOf("effects")).toBe(0)
    })

    test("the settings saved, then restored → the same volumes, nothing told", () => {
        const { settings } = playerOf()
        settings.master = 0.5
        settings.setVolume("effects", 0.25)
        const other = new SoundSettings()
        let told = 0
        other.onChanged = () => { told++ }
        other.restore(SOUND_SETTINGS_FORMAT.decode(SOUND_SETTINGS_FORMAT.encode(settings.save())))
        expect(other.master).toBe(0.5)
        expect(other.volumeOf("effects")).toBe(0.25)
        expect(told).toBe(0)
    })

    test("a setting changed → told to the listener", () => {
        const { settings } = playerOf()
        let told = 0
        settings.onChanged = () => { told++ }
        settings.master = 0.5
        settings.setVolume("effects", 0.5)
        settings.setFilters("effects", [])
        expect(told).toBe(3)
    })
})

describe("SoundPlayer, filters", () => {
    test("filters of the channel and of the sound → the channel ones first", async() => {
        const { player, audio, settings } = playerOf()
        settings.setFilters("effects", [new LowPass(800)])
        player.play("effects", "mecard/sounds/pop.wav", { filters: [new Gain(2), new Pan(-1)] })
        await settle()
        expect(audio.played[0].stages).toEqual(["biquad lowpass 800 0.71 0", "gain 2", "pan -1"])
    })

    test("a filter of the channel → made anew for each sound", async() => {
        const { player, audio, settings } = playerOf()
        settings.setFilters("effects", [new Gain(2)])
        player.play("effects", "mecard/sounds/pop.wav")
        player.play("effects", "mecard/sounds/pop.wav")
        await settle()
        expect(audio.played.map(played => played.stages)).toEqual([["gain 2"], ["gain 2"]])
    })

    test.each([
        [new LowPass(500), "biquad lowpass 500 0.71 0"],
        [new HighPass(500, 2), "biquad highpass 500 2.00 0"],
        [new BandPass(500), "biquad bandpass 500 0.71 0"],
        [new LowShelf(200, 1, 6), "biquad lowshelf 200 1.00 6"],
        [new HighShelf(4000, 1, -6), "biquad highshelf 4000 1.00 -6"],
        [new Peaking(1000, 1, 3), "biquad peaking 1000 1.00 3"],
        [new Notch(50), "biquad notch 50 0.71 0"],
        [new AllPass(100), "biquad allpass 100 0.71 0"],
        [new Gain(0.5), "gain 0.5"],
        [new Pan(1), "pan 1"],
        [new Delay(0.2, 0.4), "delay 0.2 0.4"],
        [new Reverb(1.5, 2), "reverb 1.5 2"],
        [new Compressor(-24, 30, 12, 0.003, 0.25), "compressor -24 30 12 0.003 0.25"],
        [new Distortion(20), "distortion 20"],
    ])("a filter → asks the context for its own stage (%#)", (filter, expected) => {
        expect(stageOf(filter)).toBe(expected)
    })
})

describe("SoundPlayer, loading", () => {
    test("a sound played twice → heard twice", async() => {
        const { player, audio } = playerOf()
        player.play("effects", "mecard/sounds/pop.wav")
        player.play("effects", "mecard/sounds/pop.wav")
        await settle()
        expect(audio.played).toHaveLength(2)
    })

    test("a file that does not exist → told once, nothing played", async() => {
        const { player, audio, reports } = playerOf()
        player.play("effects", "mecard/sounds/click.wav")
        player.play("effects", "mecard/sounds/click.wav")
        await settle()
        expect(audio.played).toEqual([])
        expect(reports).toHaveLength(1)
        expect(reports[0]).toContain("mecard/sounds/click.wav")
    })

    test("a file that does not decode → told, nothing played", async() => {
        const { player, audio, reports } = playerOf()
        audio.broken = true
        player.play("effects", "mecard/sounds/pop.wav")
        await settle()
        expect(audio.played).toEqual([])
        expect(reports).toHaveLength(1)
    })
})
