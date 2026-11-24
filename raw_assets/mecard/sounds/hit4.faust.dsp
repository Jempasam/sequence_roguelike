declare name "hit4";
declare description "a firm blow, 3 to 4 hearts: a clean slap with some body under it";
declare duration "0.3";

import("sfx.lib");

timing = library("lib/timing.lib.dsp");
sweeps = library("lib/sweeps.lib.dsp");
hits = library("lib/noise_hits.lib.dsp");

seed = hslider("seed", 1, 0, 9999, 1);

slap(u) = hits.slap(seed, 3000, 3400, 0.7, u);
body(u) = hits.body(seed, 500, u);
thump(u) = sweeps.sweep_sine(sfx.rand.pick(seed, 2, 120, 140), 50, 7, u);

process(t) = (slap(timing.loc(0, 0.06)) + body(timing.loc(0, 0.15)) + thump(timing.loc(0, 0.2)))
    : sfx.fx.drive(1.8) : sfx.fx.dcblock : *(0.41);
