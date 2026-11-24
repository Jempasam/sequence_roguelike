declare name "otter";
declare description "a squeak and a splash";
declare duration "0.45";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");

mix0(t) = (p(0,.5,sfx.voice.squeak(900)) + p(.4,1,sfx.nature.splash)*.35) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.661;
