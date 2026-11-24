declare name "metal";
declare description "a metallic ring added to a sound";

import("sfx.lib");

filter(s, t) = s(t) : sfx.fx.ring(210) : sfx.filter.comb(360, 0.5);
