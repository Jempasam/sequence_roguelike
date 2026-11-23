declare name "marked";
declare description "a ringing metallic ping: a target set";
declare duration "0.4";

import("sfx.lib");

process(t) = sfx.osc.fm(1200, 3.5, 2) * sfx.env.decay(8, t) * 0.25;
