declare name "hit2";
declare description "a light blow, 1 to 2 hearts: a dry, muted tap with almost no low end";
declare duration "0.22";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

loc(start, length) = min(max(sfx.env.secs - start, 0) / length, 1);

slap(u) = (sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 1, 2600, 3000))) * sfx.env.decay(7, u) * 0.7;
thump(u) = sfx.osc.sine(sfx.env.sweep(sfx.rand.pick(seed, 2, 140, 160), 60, u)) * sfx.env.decay(7, u);

process(t) = (slap(loc(0, 0.04)) + thump(loc(0, 0.12))) : sfx.fx.drive(1.4) : sfx.fx.dcblock : *(0.375);
