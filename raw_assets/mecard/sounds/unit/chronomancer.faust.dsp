declare name "chronomancer";
declare description "ticks and a backward sweep";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
bell_79 = library("../lib/halt_voices/bell_79.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");

mix0(t) = (p(0,.15,click_04.sound) + p(.2,.35,click_04.sound) + p(.4,.55,click_04.sound) + p(.5,1,magic.cast(2500,400))*.6 + p(.6,1,bell_79.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.108;
