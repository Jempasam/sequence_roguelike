import type { AudioPort, AudioStage, Sound } from "../../platform"

/** The sound of {@link NullAudioPort}, which lasts no time. */
const SILENT: Sound = { duration: 0 }

/** The stage of {@link NullAudioPort}, which changes nothing. */
const PASS: AudioStage = {}

/**
 * Speakers that play nothing, for an environment where the game runs without sound, such as a headless
 * one. Every sound it decodes is accepted, whatever its bytes.
 */
export class NullAudioPort implements AudioPort {


    public async decode(): Promise<Sound> { return SILENT }

    public play(): void {}

    public biquad(): AudioStage { return PASS }

    public gain(): AudioStage { return PASS }

    public pan(): AudioStage { return PASS }

    public delay(): AudioStage { return PASS }

    public reverb(): AudioStage { return PASS }

    public compressor(): AudioStage { return PASS }

    public distortion(): AudioStage { return PASS }
}
