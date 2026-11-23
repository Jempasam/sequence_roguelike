declare name "weakened";
declare description "a sad falling triangle note";
declare duration "0.45";

import("sfx.lib");

process(t) = sfx.osc.tri(sfx.env.sweep(500, 330, t)) * sfx.env.fadeio(0.05, 0.8, t) * 0.3;
