declare name "step";
declare description "a footstep on the board: a low, grainy rub of a sole dragging on the floor";
declare duration "0.14";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

rub(t) = (sfx.rand.noise(seed) : fi.lowpass(2, sfx.rand.pick(seed, 1, 280, 360)) : fi.highpass(1, 120))
    * sfx.env.attack(0.1, t) * sfx.env.decay(5, t) * 9;
grain(t) = 0.35 + 0.65 * abs(os.osc(sfx.rand.pick(seed, 2, 95, 125) - 30 * t));

process(t) = rub(t) * grain(t) * 0.7;
