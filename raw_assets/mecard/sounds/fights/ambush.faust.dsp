declare name "ambush";
declare description "a muffled low tom then a snare crack: an ambush";
declare duration "0.6";

import("sfx.lib");

timing = library("../lib/timing.lib.dsp");

process(t) = (sfx.perc.tom(80, timing.u1(.3, t)) * timing.g1(.3, t) * .9 + sfx.perc.snare(timing.u2(.3, t)) * timing.g2(.3, t) * .8) : sfx.fx.dcblock : *(0.8);
