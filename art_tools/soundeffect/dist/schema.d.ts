/** JSON Schema of the `--batch` manifest, for an editor or for the skill. */
export declare const MANIFEST_SCHEMA: {
    readonly $schema: "http://json-schema.org/draft-07/schema#";
    readonly title: "sfx batch manifest";
    readonly description: "A list of sounds to render in one command: `sfx render --batch jobs.json`. Paths are relative to the manifest.";
    readonly type: "array";
    readonly items: {
        readonly type: "object";
        readonly required: readonly ["src"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly src: {
                readonly type: "string";
                readonly description: "The Faust source, `<name>.faust.dsp`.";
            };
            readonly out: {
                readonly type: "string";
                readonly description: "Output file; the extension picks the format. Default: beside the source.";
            };
            readonly format: {
                readonly enum: readonly ["mp3", "wav", "ogg"];
            };
            readonly bitrate: {
                readonly type: "number";
                readonly description: "MP3 kbps, or the matching Ogg Vorbis quality (default 128).";
            };
            readonly duration: {
                readonly type: "number";
                readonly exclusiveMinimum: 0;
                readonly maximum: 60;
                readonly description: "Seconds; overrides `declare duration`.";
            };
            readonly rate: {
                readonly type: "number";
                readonly description: "Sample rate in Hz (default 44100).";
            };
            readonly normalize: {
                readonly type: "number";
                readonly description: "Scale the peak to this level in dBFS (for example -1).";
            };
            readonly fade: {
                readonly type: "boolean";
                readonly description: "Fade the first and last milliseconds (default true).";
            };
            readonly params: {
                readonly type: "object";
                readonly additionalProperties: {
                    readonly type: "number";
                };
                readonly description: "Values for the sliders of the sound, by name.";
            };
        };
    };
};
