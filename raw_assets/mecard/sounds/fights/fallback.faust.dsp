declare name "fallback";
declare description "two quick blows of a blade: a fight of no known sort";
declare duration "0.5";

import("sfx.lib");

timing = library("../lib/timing.lib.dsp");

process(t) = (sfx.perc.clang(650, timing.u1(.5, t)) * timing.g1(.5, t) * .5 + sfx.perc.clang(520, timing.u2(.5, t)) * timing.g2(.5, t) * .5) : sfx.fx.dcblock : *(1.730);
