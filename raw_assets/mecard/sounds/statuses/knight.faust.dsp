declare name "knight";
declare description "two quick hoof clops";
declare duration "0.35";

import("sfx.lib");

process(t) = (sfx.perc.tom(330, min(t * 2, 1)) * (t < 0.5) + sfx.perc.tom(330, max(t * 2 - 1, 0)) * (t >= 0.5)) * 0.5;
