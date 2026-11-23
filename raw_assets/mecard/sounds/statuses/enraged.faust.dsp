declare name "enraged";
declare description "a rough saw falling";
declare duration "0.4";

import("sfx.lib");

process(t) = (sfx.osc.saw(sfx.env.sweep(300, 150, t)) : fi.lowpass(2, 1500)) * sfx.env.fadeio(0.05, 0.6, t) * 0.35;
