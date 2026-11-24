declare name "glass_man";
declare description "a fragile tinkle and a crack";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");

mix0(t) = (p(0,1,bell_88.sound)*.7 + p(.1,.3,click_04.sound)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.804;
