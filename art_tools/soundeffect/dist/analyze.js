/** Measurements on rendered audio — shared by the CLI (`inspect`) and the web editor. */
const db = (linear) => linear > 1e-9 ? 20 * Math.log10(linear) : -180;
/** In-place radix-2 FFT; the length must be a power of two. */
export function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1)
            j ^= bit;
        j ^= bit;
        if (i < j) {
            const r = re[i];
            re[i] = re[j];
            re[j] = r;
            const m = im[i];
            im[i] = im[j];
            im[j] = m;
        }
    }
    for (let size = 2; size <= n; size <<= 1) {
        const angle = -2 * Math.PI / size;
        const wr = Math.cos(angle), wi = Math.sin(angle);
        for (let start = 0; start < n; start += size) {
            let cr = 1, ci = 0;
            for (let k = 0; k < size / 2; k++) {
                const a = start + k, b = a + size / 2;
                const tr = re[b] * cr - im[b] * ci;
                const ti = re[b] * ci + im[b] * cr;
                re[b] = re[a] - tr;
                im[b] = im[a] - ti;
                re[a] += tr;
                im[a] += ti;
                const next = cr * wr - ci * wi;
                ci = cr * wi + ci * wr;
                cr = next;
            }
        }
    }
}
/** Spectral centroid (the "brightness" of the sound), in Hz. */
export function centroid(mono, sampleRate) {
    let size = 1;
    while (size < Math.min(mono.length, 1 << 15))
        size <<= 1;
    if (size < 64)
        return 0;
    const re = new Float64Array(size), im = new Float64Array(size);
    const start = Math.max(0, Math.floor((mono.length - size) / 2));
    for (let i = 0; i < size && start + i < mono.length; i++) {
        re[i] = mono[start + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)));
    }
    fft(re, im);
    let weighted = 0, total = 0;
    for (let i = 1; i < size / 2; i++) {
        const magnitude = Math.hypot(re[i], im[i]);
        weighted += magnitude * i * sampleRate / size;
        total += magnitude;
    }
    return total > 0 ? weighted / total : 0;
}
export function analyze(channels, sampleRate, slices = 48) {
    const frames = channels[0]?.length ?? 0;
    let peak = 0, sumSquares = 0, sum = 0, clipped = 0, nonFinite = 0;
    const mono = new Float32Array(frames);
    const sliceSize = Math.max(1, Math.ceil(frames / slices));
    const envelope = [];
    let slicePeak = 0;
    let firstLoud = -1;
    for (let i = 0; i < frames; i++) {
        let mix = 0;
        for (const channel of channels) {
            const v = channel[i];
            if (!Number.isFinite(v)) {
                nonFinite++;
                continue;
            }
            const a = Math.abs(v);
            if (a > peak)
                peak = a;
            if (a > 1)
                clipped++;
            sumSquares += v * v;
            sum += v;
            mix += v;
            if (a > slicePeak)
                slicePeak = a;
        }
        mono[i] = mix / channels.length;
        if (firstLoud < 0 && Math.abs(mono[i]) > 0.001)
            firstLoud = i;
        if ((i + 1) % sliceSize === 0 || i === frames - 1) {
            envelope.push(db(slicePeak));
            slicePeak = 0;
        }
    }
    const samples = Math.max(1, frames * channels.length);
    // The renders fade the last 5 ms to zero (so a file never clicks): look just before that.
    const tailEnd = Math.max(1, frames - Math.round(sampleRate * 0.005));
    const tailLength = Math.min(tailEnd, Math.max(1, Math.round(sampleRate * 0.007)));
    let tailSquares = 0;
    for (let i = tailEnd - tailLength; i < tailEnd; i++) {
        for (const channel of channels)
            if (Number.isFinite(channel[i]))
                tailSquares += channel[i] * channel[i];
    }
    return {
        sampleRate,
        channels: channels.length,
        frames,
        duration: frames / sampleRate,
        peak,
        peakDb: db(peak),
        rmsDb: db(Math.sqrt(sumSquares / samples)),
        clipped,
        dcOffset: sum / samples,
        tailDb: db(Math.sqrt(tailSquares / (tailLength * channels.length))),
        headSilenceMs: firstLoud < 0 ? frames / sampleRate * 1000 : firstLoud / sampleRate * 1000,
        nonFinite,
        centroidHz: centroid(mono, sampleRate),
        envelope,
    };
}
/** Things that usually mean the sound needs another pass. */
export function warnings(stats) {
    const out = [];
    if (stats.nonFinite > 0)
        out.push(`${stats.nonFinite} samples are NaN/Infinity (a filter or a division blew up)`);
    if (stats.peak < 1e-4)
        out.push("the sound is silent");
    else {
        if (stats.peak > 1)
            out.push(`clipping: peak ${stats.peakDb.toFixed(1)} dBFS, ${stats.clipped} samples beyond full scale — lower the gain or use --normalize -1`);
        if (stats.peakDb < -30)
            out.push(`very quiet: peak ${stats.peakDb.toFixed(1)} dBFS — raise the gain or use --normalize -1`);
        if (stats.tailDb > stats.peakDb - 20 && stats.tailDb > -50)
            out.push(`the sound is cut off, not finished: just before the end it is still at ${stats.tailDb.toFixed(1)} dBFS (peak ${stats.peakDb.toFixed(1)}) — lengthen the duration or make the envelope reach 0 at t = 1`);
        if (Math.abs(stats.dcOffset) > 0.02)
            out.push(`DC offset ${stats.dcOffset.toFixed(3)} — add a high-pass (fi.dcblocker)`);
        if (stats.headSilenceMs > 80)
            out.push(`${stats.headSilenceMs.toFixed(0)} ms of silence before the sound starts`);
    }
    return out;
}
const SHADES = " .:-=+*#%@";
/** One line per measurement, readable in a terminal: this is how the command line "listens". */
export function describe(stats) {
    const floor = -60;
    const bars = stats.envelope.map(level => {
        const unit = Math.max(0, Math.min(1, (level - floor) / -floor));
        return SHADES[Math.round(unit * (SHADES.length - 1))];
    }).join("");
    const cell = stats.duration / Math.max(1, stats.envelope.length);
    return [
        `duration  ${stats.duration.toFixed(3)} s, ${stats.channels === 1 ? "mono" : "stereo"}, ${stats.sampleRate} Hz`,
        `peak      ${stats.peakDb.toFixed(1)} dBFS   rms ${stats.rmsDb.toFixed(1)} dBFS   tail ${stats.tailDb.toFixed(1)} dBFS`,
        `bright    ${Math.round(stats.centroidHz)} Hz (spectral centroid)`,
        `envelope  |${bars}|  (${(cell * 1000).toFixed(1)} ms per cell, ${floor}..0 dBFS)`,
    ];
}
