declare name "battle";
declare description "two sword clangs: an ordinary fight";
declare duration "0.6";

import("sfx.lib");

u1(a, t) = min(t / a, 1);
u2(a, t) = max((t - a) / (1 - a), 0);
g1(a, t) = (t < a);
g2(a, t) = (t >= a);

process(t) = (sfx.perc.clang(600, u1(.45, t)) * g1(.45, t) * .5 + sfx.perc.clang(550, u2(.45, t)) * g2(.45, t) * .5) : sfx.fx.dcblock : *(1.730);
