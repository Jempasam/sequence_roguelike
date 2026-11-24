declare name "hit12";
declare description "a crushing blow, 9 hearts or more: a deep boom, a hard crack, rubble and a lower echo";
declare duration "0.7";

import("sfx.lib");

timing = library("lib/timing.lib.dsp");
sweeps = library("lib/sweeps.lib.dsp");
hits = library("lib/noise_hits.lib.dsp");

seed = hslider("seed", 1, 0, 9999, 1);

click(u) = hits.click(seed, 5000, u);
slap(u) = hits.slap(seed, 4300, 4700, 0.8, u);
thump(u) = sweeps.sweep_sine(sfx.rand.pick(seed, 2, 100, 120), 45, 7, u);
boom(u) = sweeps.sweep_sine(85, 28, 7, u);
rubble(u) = hits.rubble(seed, u);
echo(u) = sweeps.sweep_sine(60, 30, 7, u) * 0.5;

process(t) = (click(timing.loc(0, 0.01)) + slap(timing.loc(0, 0.1)) + thump(timing.loc(0, 0.35)) + boom(timing.loc(0, 0.6))
    + rubble(timing.loc(0.06, 0.55)) * timing.on(0.06) + echo(timing.loc(0.18, 0.25)) * timing.on(0.18))
    : sfx.fx.drive(2.6) : sfx.fx.dcblock : *(0.64);
