declare name "soul_shielded";
declare description "an ethereal high FM shimmer";
declare duration "0.6";

import("sfx.lib");

process(t) = sfx.osc.fm(660, 2, 1.5) * sfx.env.fadeio(0.2, 0.7, t) * 0.25 : sfx.fx.reverb(0.85, 0.4);
