declare name "turn";
declare description "a pivot on the spot: a low, soft friction, a sole dragging on the floor";
declare duration "0.16";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

grain(t) = 0.55 + 0.45 * os.osc(sfx.rand.pick(seed, 2, 55, 75) + 30 * t);
rub(t) = (sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 1, 200, 260)) : fi.highpass(1, 90))
    * grain(t) * sfx.env.fadeio(0.2, 0.6, t) * 3.2;
body(t) = sfx.osc.sine(sfx.env.sweep(95, 70, t)) * sfx.env.fadeio(0.3, 0.6, t) * 0.25;

process(t) = (rub(t) + body(t)) * 0.7;
