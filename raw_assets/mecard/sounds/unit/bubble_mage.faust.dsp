declare name "bubble_mage";
declare description "a bubble and a chime";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
bubble_450 = library("../lib/halt_voices/bubble_450.lib.dsp");

mix0(t) = (p(0,.5,bubble_450.sound) + p(.3,1,magic.chime(880))*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.679;
