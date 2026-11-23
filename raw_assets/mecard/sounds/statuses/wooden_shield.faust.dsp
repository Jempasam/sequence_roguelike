declare name "wooden_shield";
declare description "a wooden knock";
declare duration "0.25";

import("sfx.lib");

process(t) = sfx.perc.tom(260, t) * 0.5 + (no.noise : fi.resonbp(900, 2, 1)) * sfx.env.decay(40, t) * 0.4;
