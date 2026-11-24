declare name "giant";
declare description "any colossus: a deep grunt";
declare duration "0.9";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
human = library("../lib/human.lib.dsp");
size = library("../filters/size.lib.dsp");
thud = library("../../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.8,human.effort(70)) + p(.4,1,thud.sound)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.7, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.804;
