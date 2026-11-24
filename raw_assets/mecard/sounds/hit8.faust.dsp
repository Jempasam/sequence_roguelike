declare name "hit8";
declare description "a heavy blow, 5 to 8 hearts: a cracking attack, a deep thump and rubble falling after";
declare duration "0.45";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

loc(start, length) = min(max(sfx.env.secs - start, 0) / length, 1);
on(start) = sfx.env.secs >= start;

click(u) = (sfx.rand.noise(seed + 3) : fi.highpass(2, 4000)) * sfx.env.decay(7, u) * 0.8;
slap(u) = (sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 1, 3800, 4200))) * sfx.env.decay(7, u) * 0.7;
body(u) = (sfx.rand.noise(seed + 7) : fi.resonbp(400, 1.5, 1)) * sfx.env.decay(7, u) * 2;
thump(u) = sfx.osc.sine(sfx.env.sweep(sfx.rand.pick(seed, 2, 100, 120), 38, u)) * sfx.env.decay(7, u);
rubble(u) = (sfx.rand.noise(seed + 11) : fi.lowpass(2, 700)) * sfx.env.decay(7, u) * 0.8;

process(t) = (click(loc(0, 0.008)) + slap(loc(0, 0.08)) + body(loc(0, 0.2)) + thump(loc(0, 0.3))
    + rubble(loc(0.04, 0.35)) * on(0.04))
    : sfx.fx.drive(2.2) : sfx.fx.dcblock : *(0.5);
