declare name "elite";
declare description "a heavy thud then two lower clangs: a harder fight";
declare duration "0.8";

import("sfx.lib");

timing = library("../lib/timing.lib.dsp");

process(t) = (sfx.perc.thud(timing.u1(.25, t)) * timing.g1(.25, t) * .8 + sfx.perc.clang(420, timing.u2(.25, t)) * timing.g2(.25, t) * .6 + sfx.perc.clang(330, timing.u2(.6, t)) * timing.g2(.6, t) * .0) : sfx.fx.dcblock : *(1.043);
