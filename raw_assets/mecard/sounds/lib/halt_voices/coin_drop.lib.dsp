declare name "coin_drop";
declare description "a voice shared by the halts: a coin falling and bouncing, sfx.impact.bounce(3, .3, metal(2600,.7), u)";
declare duration "0.3";

import("sfx.lib");

sound(t) = sfx.impact.bounce(3, 0.3, sfx.impact.metal(2600, 0.7), t);

process(t) = sound(t);
