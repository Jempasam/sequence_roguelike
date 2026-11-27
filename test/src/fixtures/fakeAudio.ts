import type { AudioPort, AudioStage, BiquadKind, PlayOptions, Sound } from "@game/core-src/platform/AudioPort"

/** A stage that records how it was asked for, as text. */
export type FakeStage = { readonly made: string }

/** One sound played on a {@link FakeAudio}. */
export interface Played {
    /** The first two bytes of the file, which tell which file it is. */
    readonly id: number

    /** The volume it was played at. */
    readonly volume: number

    /** How its stages were asked for, in the order of the chain. */
    readonly stages: readonly string[]
}

/** Speakers that record what is played, so the sounds are tested without any. */
export class FakeAudio implements AudioPort {


    /** Everything played, in order. */
    public readonly played: Played[] = []

    /** Do the sounds fail to decode? */
    public broken = false

    public async decode(bytes: Uint8Array): Promise<Sound> {
        if(this.broken) throw new Error("Not a sound.")
        return { duration: 1, id: bytes[0] + (bytes[1] ?? 0) * 256 } as Sound
    }

    public play(sound: Sound, { volume, stages }: PlayOptions): void {
        const { id } = sound as Sound & { id: number }
        this.played.push({ id, volume, stages: stages.map(stage => (stage as FakeStage).made) })
    }

    public biquad(kind: BiquadKind, frequency: number, quality: number, gain: number): AudioStage {
        return this.#stage(`biquad ${kind} ${frequency} ${quality.toFixed(2)} ${gain}`)
    }

    public gain(volume: number): AudioStage { return this.#stage(`gain ${volume}`) }

    public pan(position: number): AudioStage { return this.#stage(`pan ${position}`) }

    public delay(time: number, feedback: number): AudioStage { return this.#stage(`delay ${time} ${feedback}`) }

    public reverb(duration: number, decay: number): AudioStage { return this.#stage(`reverb ${duration} ${decay}`) }

    public compressor(
        threshold: number, knee: number, ratio: number, attack: number, release: number,
    ): AudioStage {
        return this.#stage(`compressor ${threshold} ${knee} ${ratio} ${attack} ${release}`)
    }

    public distortion(amount: number): AudioStage { return this.#stage(`distortion ${amount}`) }


    #stage(made: string): FakeStage {
        return { made }
    }
}
