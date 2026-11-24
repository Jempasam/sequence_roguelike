declare name "sniper";
declare description "a click, then a distant dry shot";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");

mix0(t) = (p(0,.2,click_04.sound) + p(.3,1,weapon.shot)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.7, 0.4, mix0, t) * 0.543;
