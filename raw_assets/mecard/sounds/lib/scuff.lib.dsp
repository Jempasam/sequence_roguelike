declare name "scuff";
declare description "the noise of a sole dragging: low-passed then high-passed noise, with no envelope";

import("sfx.lib");

rub_noise(seed, lo, hi, hp) = sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 1, lo, hi)) : fi.highpass(1, hp);
