declare name "slowed";
declare description "a note sinking slowly";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.osc.sine(sfx.env.sweep(400, 100, t)) * sfx.env.fadeio(0.05, 0.8, t) * 0.35;
