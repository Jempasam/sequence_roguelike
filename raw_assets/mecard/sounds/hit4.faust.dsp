declare name "hit4";
declare description "a firm blow, 3 to 4 hearts: a clean slap with some body under it";
declare duration "0.3";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

loc(start, length) = min(max(sfx.env.secs - start, 0) / length, 1);

slap(u) = (sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 1, 3000, 3400))) * sfx.env.decay(7, u) * 0.7;
body(u) = (sfx.rand.noise(seed + 7) : fi.resonbp(500, 1.5, 1)) * sfx.env.decay(7, u) * 2;
thump(u) = sfx.osc.sine(sfx.env.sweep(sfx.rand.pick(seed, 2, 120, 140), 50, u)) * sfx.env.decay(7, u);

process(t) = (slap(loc(0, 0.06)) + body(loc(0, 0.15)) + thump(loc(0, 0.2)))
    : sfx.fx.drive(1.8) : sfx.fx.dcblock : *(0.41);
