/** JSON Schema of the `--batch` manifest, for an editor or for the skill. */
export const MANIFEST_SCHEMA = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "sfx batch manifest",
    description: "A list of sounds to render in one command: `sfx render --batch jobs.json`. Paths are relative to the manifest.",
    type: "array",
    items: {
        type: "object",
        required: ["src"],
        additionalProperties: false,
        properties: {
            src: { type: "string", description: "The Faust source, `<name>.faust.dsp`." },
            out: { type: "string", description: "Output file; the extension picks the format. Default: beside the source." },
            format: { enum: ["mp3", "wav", "ogg"] },
            bitrate: { type: "number", description: "MP3 kbps, or the matching Ogg Vorbis quality (default 128)." },
            duration: { type: "number", exclusiveMinimum: 0, maximum: 60, description: "Seconds; overrides `declare duration`." },
            rate: { type: "number", description: "Sample rate in Hz (default 44100)." },
            normalize: { type: "number", description: "Scale the peak to this level in dBFS (for example -1)." },
            fade: { type: "boolean", description: "Fade the first and last milliseconds (default true)." },
            params: { type: "object", additionalProperties: { type: "number" }, description: "Values for the sliders of the sound, by name." },
        },
    },
};
