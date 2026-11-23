declare name "death";
declare description "a fall: a sinking tone and a breath of noise dying out";
declare duration "0.8";

import("sfx.lib");

sink(t) = sfx.osc.saw(sfx.env.sweep(330, 55, t)) : fi.lowpass(2, 900);
breath(t) = (no.noise : sfx.filter.sweep_lp(3000, 200, 1, t)) * 0.5;

process(t) = ((sink(t) * 0.5 + breath(t)) * sfx.env.decay(5, t) * sfx.env.attack(0.02, t) : sfx.fx.reverb(0.7, 0.2))
    * 0.8;
