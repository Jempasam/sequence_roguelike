declare name "poisoned";
declare description "a bubbling, falling warble";
declare duration "0.45";

import("sfx.lib");

process(t) = sfx.osc.sine(sfx.env.sweep(600, 200, t) * (1 + 0.25 * os.osc(18))) * sfx.env.fadeio(0.05, 0.7, t) * 0.3;
