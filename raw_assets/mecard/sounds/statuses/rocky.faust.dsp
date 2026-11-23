declare name "rocky";
declare description "a stone clack and a thump";
declare duration "0.3";

import("sfx.lib");

process(t) = sfx.perc.tom(150, t) * 0.4 + (no.noise : fi.resonbp(2500, 3, 1)) * sfx.env.decay(60, t) * 0.4;
