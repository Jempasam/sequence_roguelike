declare name "elite";
declare description "a heavy thud then two lower clangs: a harder fight";
declare duration "0.8";

import("sfx.lib");

u1(a, t) = min(t / a, 1);
u2(a, t) = max((t - a) / (1 - a), 0);
g1(a, t) = (t < a);
g2(a, t) = (t >= a);

process(t) = (sfx.perc.thud(u1(.25, t)) * g1(.25, t) * .8 + sfx.perc.clang(420, u2(.25, t)) * g2(.25, t) * .6 + sfx.perc.clang(330, u2(.6, t)) * g2(.6, t) * .0) : sfx.fx.dcblock : *(1.043);
