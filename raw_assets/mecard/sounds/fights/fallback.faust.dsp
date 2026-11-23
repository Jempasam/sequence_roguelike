declare name "fallback";
declare description "two quick blows of a blade: a fight of no known sort";
declare duration "0.5";

import("sfx.lib");

u1(a, t) = min(t / a, 1);
u2(a, t) = max((t - a) / (1 - a), 0);
g1(a, t) = (t < a);
g2(a, t) = (t >= a);

process(t) = (sfx.perc.clang(650, u1(.5, t)) * g1(.5, t) * .5 + sfx.perc.clang(520, u2(.5, t)) * g2(.5, t) * .5) : sfx.fx.dcblock : *(1.730);
