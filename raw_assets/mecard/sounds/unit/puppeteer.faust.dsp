declare name "puppeteer";
declare description "strings and wood";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
creak = library("../lib/halt_voices/creak.lib.dsp");
pluck_79 = library("../lib/halt_voices/pluck_79.lib.dsp");
wood_900 = library("../lib/halt_voices/wood_900.lib.dsp");

mix0(t) = (p(0,.3,pluck_79.sound) + p(.25,.5,wood_900.sound) + p(.45,1,creak.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.259;
