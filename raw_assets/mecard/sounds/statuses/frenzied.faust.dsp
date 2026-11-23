declare name "frenzied";
declare description "a stuttering pulse";
declare duration "0.35";

import("sfx.lib");

process(t) = sfx.osc.pulse(500, 0.5) * (sfx.env.tooth(8, t) < 0.5) * sfx.env.fadeio(0.05, 0.4, t) * 0.2;
