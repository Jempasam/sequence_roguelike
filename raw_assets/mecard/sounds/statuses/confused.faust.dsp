declare name "confused";
declare description "a dizzy wobbling note";
declare duration "0.45";

import("sfx.lib");

process(t) = sfx.osc.sine(sfx.osc.vibrato(500, 0.15, 8)) * sfx.env.fadeio(0.1, 0.6, t) * 0.25;
