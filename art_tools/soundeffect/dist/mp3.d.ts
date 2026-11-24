/**
 * Float channels (mono or stereo) → bytes of an MP3 file.
 *
 * MP3 encoders add a little silence before the first sample (the encoder delay) and the format
 * cannot loop seamlessly: render to WAV for a sound that has to loop.
 */
export declare function encodeMp3(channels: Float32Array[], sampleRate: number, kbps?: number): Uint8Array;
