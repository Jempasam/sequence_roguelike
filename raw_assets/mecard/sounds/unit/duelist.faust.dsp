declare name "duelist";
declare description "a hah and a foil";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.4,human.hah(260)) + p(.3,1,weapon.blade)*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.902;
