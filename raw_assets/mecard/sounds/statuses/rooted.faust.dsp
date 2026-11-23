declare name "rooted";
declare description "a low groan and a dull thump";
declare duration "0.5";

import("sfx.lib");

process(t) = (sfx.osc.saw(sfx.env.sweep(90, 60, t)) : fi.lowpass(2, 300)) * sfx.env.fadeio(0.1, 0.6, t) * 0.5 + sfx.perc.thud(t) * 0.3;
