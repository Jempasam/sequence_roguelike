declare name "burning_ground";
declare description "a lower, longer crackle of fire";
declare duration "0.6";

import("sfx.lib");

process(t) = (no.noise * (sfx.noise.crackle(0.05) != 0) : fi.resonbp(2200, 1.5, 1)) * sfx.env.decay(4, t) * 1.3 + (no.noise : fi.lowpass(2, 400)) * sfx.env.fadeio(0.2, 0.7, t) * 0.4;
