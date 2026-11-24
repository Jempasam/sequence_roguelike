declare name "battle";
declare description "two sword clangs: an ordinary fight";
declare duration "0.6";

import("sfx.lib");

timing = library("../lib/timing.lib.dsp");

process(t) = (sfx.perc.clang(600, timing.u1(.45, t)) * timing.g1(.45, t) * .5 + sfx.perc.clang(550, timing.u2(.45, t)) * timing.g2(.45, t) * .5) : sfx.fx.dcblock : *(1.730);
