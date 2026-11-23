declare name "swallowed";
declare description "a gulp: a quick falling note";
declare duration "0.3";

import("sfx.lib");

process(t) = sfx.osc.sine(sfx.env.sweep(400, 90, t)) * sfx.env.decay(6, t) * 0.5;
