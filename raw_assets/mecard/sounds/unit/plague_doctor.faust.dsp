declare name "plague_doctor";
declare description "a dry cough and a funeral bell";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
hollow = library("filters/hollow.lib.dsp");
bell_79 = library("../lib/halt_voices/bell_79.lib.dsp");

mix0(t) = (p(0,.4,human.effort(110)) + p(.35,1,bell_79.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.569;
