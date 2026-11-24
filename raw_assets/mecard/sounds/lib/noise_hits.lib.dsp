declare name "noise_hits";
declare description "the noisy parts of a blow: a slap, a click, a body and a rubble, each drawn from a seed";

import("sfx.lib");

slap(seed, lo, hi, gain, u) = (sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 1, lo, hi))) * sfx.env.decay(7, u) * gain;
click(seed, fc, u) = (sfx.rand.noise(seed + 3) : fi.highpass(2, fc)) * sfx.env.decay(7, u) * 0.8;
body(seed, fc, u) = (sfx.rand.noise(seed + 7) : fi.resonbp(fc, 1.5, 1)) * sfx.env.decay(7, u) * 2;
rubble(seed, u) = (sfx.rand.noise(seed + 11) : fi.lowpass(2, 700)) * sfx.env.decay(7, u) * 0.8;
