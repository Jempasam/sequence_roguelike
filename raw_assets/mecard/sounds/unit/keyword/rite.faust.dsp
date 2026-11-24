declare name "rite";
declare description "any priest: a bell and a choir";
declare duration "0.8";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
bell_79 = library("../../lib/halt_voices/bell_79.lib.dsp");

mix0(t) = (p(0,.5,bell_79.sound)*.6 + p(.2,1,sfx.voice.choir_v(0,330))*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.884;
