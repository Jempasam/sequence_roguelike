declare name "burn";
declare description "crackling flames over a low roar";
declare duration "0.5";

import("sfx.lib");

process(t) = (no.noise * (sfx.noise.crackle(0.08) != 0) : fi.resonbp(3000, 1.5, 1)) * sfx.env.decay(5, t) * 1.5 + (no.noise : fi.lowpass(2, 600)) * sfx.env.fadeio(0.1, 0.8, t) * 0.3;
