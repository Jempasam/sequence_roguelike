declare name "fallback_negative";
declare description "a dull falling buzz: a bad status";
declare duration "0.35";

import("sfx.lib");

process(t) = (sfx.osc.saw(sfx.env.sweep(300, 110, t)) : fi.lowpass(2, 700)) * sfx.env.fadeio(0.05, 0.7, t) * 0.35;
