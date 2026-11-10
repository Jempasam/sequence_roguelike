/**
 * @packageDocumentation
 * The sound of the game. A {@link SoundPlayer} plays the sounds shipped with it on channels, as loud as
 * the {@link SoundSettings} of the player say, through the {@link SoundFilter}s of the channel and of the
 * sound: {@link BiquadFilter} and its kinds, {@link Gain}, {@link Pan}, {@link Delay}, {@link Reverb},
 * {@link Compressor} and {@link Distortion}. {@link NullAudioPort} plays nothing, for an environment
 * without speakers.
 */

export * from "./BiquadFilters"
export * from "./Filters"
export * from "./NullAudioPort"
export * from "./SoundFilter"
export * from "./SoundPlayer"
export * from "./SoundSettings"
export * from "./soundSlot"
