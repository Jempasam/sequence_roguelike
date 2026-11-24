declare name "toxic_toad";
declare description "a wet croak";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
wet = library("filters/wet.lib.dsp");
bubble_450 = library("../lib/halt_voices/bubble_450.lib.dsp");

mix0(t) = (p(0,.6,sfx.life.frog(150)) + p(.4,1,bubble_450.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = wet.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 1.758;
