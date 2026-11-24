declare name "hit8";
declare description "a heavy blow, 5 to 8 hearts: a cracking attack, a deep thump and rubble falling after";
declare duration "0.45";

import("sfx.lib");

timing = library("lib/timing.lib.dsp");
sweeps = library("lib/sweeps.lib.dsp");
hits = library("lib/noise_hits.lib.dsp");

seed = hslider("seed", 1, 0, 9999, 1);

click(u) = hits.click(seed, 4000, u);
slap(u) = hits.slap(seed, 3800, 4200, 0.7, u);
body(u) = hits.body(seed, 400, u);
thump(u) = sweeps.sweep_sine(sfx.rand.pick(seed, 2, 100, 120), 38, 7, u);
rubble(u) = hits.rubble(seed, u);

process(t) = (click(timing.loc(0, 0.008)) + slap(timing.loc(0, 0.08)) + body(timing.loc(0, 0.2)) + thump(timing.loc(0, 0.3))
    + rubble(timing.loc(0.04, 0.35)) * timing.on(0.04))
    : sfx.fx.drive(2.2) : sfx.fx.dcblock : *(0.5);
