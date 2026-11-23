declare name "fragile";
declare description "a glassy crack";
declare duration "0.3";

import("sfx.lib");

process(t) = (no.noise : fi.highpass(2, 4000)) * sfx.env.decay(70, t) * 0.4 + (no.noises(2, 1) * (sfx.noise.crackle(0.06) != 0) : fi.resonbp(5200, 3, 1)) * sfx.env.decay(9, t) * 1.2;
