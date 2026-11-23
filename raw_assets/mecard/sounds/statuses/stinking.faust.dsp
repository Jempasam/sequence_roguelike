declare name "stinking";
declare description "a low gurgling rumble";
declare duration "0.45";

import("sfx.lib");

process(t) = (no.noise : fi.lowpass(2, 500)) * (1 + os.osc(14)) * sfx.env.fadeio(0.2, 0.6, t) * 0.4;
