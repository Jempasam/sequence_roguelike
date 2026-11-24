declare name "witcher";
declare description "a silver bell and a blade";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
bell_79 = library("../lib/halt_voices/bell_79.lib.dsp");

mix0(t) = (p(0,.5,bell_79.sound)*.5 + p(.3,.6,weapon.blade) + p(.5,1,magic.cast(500,1500))*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.248;
