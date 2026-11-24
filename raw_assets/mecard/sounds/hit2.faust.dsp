declare name "hit2";
declare description "a light blow, 1 to 2 hearts: a dry, muted tap with almost no low end";
declare duration "0.22";

import("sfx.lib");

timing = library("lib/timing.lib.dsp");
sweeps = library("lib/sweeps.lib.dsp");
hits = library("lib/noise_hits.lib.dsp");

seed = hslider("seed", 1, 0, 9999, 1);

slap(u) = hits.slap(seed, 2600, 3000, 0.7, u);
thump(u) = sweeps.sweep_sine(sfx.rand.pick(seed, 2, 140, 160), 60, 7, u);

process(t) = (slap(timing.loc(0, 0.04)) + thump(timing.loc(0, 0.12))) : sfx.fx.drive(1.4) : sfx.fx.dcblock : *(0.375);
