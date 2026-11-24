declare name "taxidermist";
declare description "a scratch and wood creaks";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
creak = library("../lib/halt_voices/creak.lib.dsp");
wood_900 = library("../lib/halt_voices/wood_900.lib.dsp");

mix0(t) = (p(0,.5,creak.sound)*.6 + p(.3,.6,wood_900.sound)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.966;
