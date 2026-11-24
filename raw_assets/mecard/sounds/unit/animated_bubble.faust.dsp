declare name "animated_bubble";
declare description "a watery pop and a small voice";
declare duration "0.4";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
wet = library("filters/wet.lib.dsp");
bubble_450 = library("../lib/halt_voices/bubble_450.lib.dsp");

mix0(t) = (p(0,.5,bubble_450.sound) + p(.1,.7,sfx.voice.squeak(800))*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = wet.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 3.162;
