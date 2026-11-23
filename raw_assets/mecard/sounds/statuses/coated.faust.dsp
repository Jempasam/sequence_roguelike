declare name "coated";
declare description "a slick: noise sliding over a blade";
declare duration "0.35";

import("sfx.lib");

process(t) = (no.noise : fi.resonbp(1500, 3, 1)) * sfx.env.fadeio(0.3, 0.5, t) * 0.5;
