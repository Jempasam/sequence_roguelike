declare name "boss";
declare description "a deep boom with a low gong: the guardian";
declare duration "1.4";

import("sfx.lib");

u1(a, t) = min(t / a, 1);
u2(a, t) = max((t - a) / (1 - a), 0);
g1(a, t) = (t < a);
g2(a, t) = (t >= a);

process(t) = (sfx.perc.boom(t) * .6 + sfx.perc.clang(150, t) * .5 : sfx.fx.reverb(.8, .25)) : sfx.fx.dcblock : *(0.919);
