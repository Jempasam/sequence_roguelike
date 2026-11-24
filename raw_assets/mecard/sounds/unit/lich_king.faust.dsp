declare name "lich_king";
declare description "a hollow voice and a death bell";
declare duration "1.1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
undead = library("lib/undead.lib.dsp");
magic = library("lib/magic.lib.dsp");
size = library("filters/size.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");

mix0(t) = (p(0,1,undead.hollow(110)) + p(.2,1,bell_88.sound)*.5 + p(0,1,magic.shimmer)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.5, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.501;
