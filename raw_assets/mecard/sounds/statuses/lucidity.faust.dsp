declare name "lucidity";
declare description "two clear bells";
declare duration "0.55";

import("sfx.lib");

process(t) = (sfx.osc.fm(1046, 1.41, 1) * sfx.env.decay(5, t) * 0.25 + sfx.osc.fm(1568, 1.41, 1) * sfx.env.decay(5, t) * (t > 0.15) * 0.2) : sfx.fx.reverb(0.7, 0.2);
