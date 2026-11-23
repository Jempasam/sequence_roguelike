declare name "ambush";
declare description "a muffled low tom then a snare crack: an ambush";
declare duration "0.6";

import("sfx.lib");

u1(a, t) = min(t / a, 1);
u2(a, t) = max((t - a) / (1 - a), 0);
g1(a, t) = (t < a);
g2(a, t) = (t >= a);

process(t) = (sfx.perc.tom(80, u1(.3, t)) * g1(.3, t) * .9 + sfx.perc.snare(u2(.3, t)) * g2(.3, t) * .8) : sfx.fx.dcblock : *(0.8);
