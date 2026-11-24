declare name "prestidigitator";
declare description "a sleight of hand: clicks and a rising arpeggio";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");

mix0(t) = (p(0,.1,click_04.sound) + (p(0,.3,magic.chime(1047)) + p(.2,.5,magic.chime(1319)) + p(.4,.7,magic.chime(1568)) + p(.6,1,magic.chime(2093)))*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.445;
