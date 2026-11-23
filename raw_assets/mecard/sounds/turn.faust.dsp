declare name "turn";
declare description "a pivot on the spot: a sole rubbing the floor, sliding in pitch, with a small tick";
declare duration "0.16";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

rub(t) = (sfx.rand.noise(seed) : sfx.filter.sweep_bp(sfx.rand.pick(seed, 1, 1800, 2400), 900, 3, t))
    * sfx.env.fadeio(0.15, 0.7, t) * 1;
tick(u) = (no.noise : fi.highpass(2, 3000)) * sfx.env.decay(60, u) * 0.4;

process(t) = (rub(t) + tick(min(t / 0.2, 1)) * (t < 0.2)) * 0.6;
