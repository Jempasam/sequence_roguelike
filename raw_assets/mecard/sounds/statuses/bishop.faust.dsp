declare name "bishop";
declare description "a smooth FM bell";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.osc.fm(880, 1.41, 1.5) * sfx.env.decay(5, t) * 0.3 : sfx.fx.reverb(0.7, 0.2);
