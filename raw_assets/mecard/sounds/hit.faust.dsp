declare name "hit";
declare description "a clean blow: a thump dropping in pitch under a muffled slap, a little different each time";
declare duration "0.28";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

body(t) = sfx.osc.sine(sfx.env.sweep(sfx.rand.pick(seed, 1, 130, 170), 48, t)) * sfx.env.decay(14, t);
slap(t) = (sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 2, 2200, 3200))) * sfx.env.decay(38, t) * 0.7;

process(t) = (body(t) + slap(t)) : sfx.fx.drive(1.6) : sfx.fx.dcblock : *(0.6);
