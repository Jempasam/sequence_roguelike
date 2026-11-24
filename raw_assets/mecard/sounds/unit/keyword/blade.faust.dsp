declare name "blade";
declare description "any blade: a hah and a ring";
declare duration "0.5";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
human = library("../lib/human.lib.dsp");
weapon = library("../lib/weapon.lib.dsp");

mix0(t) = (p(0,.4,human.hah(220)) + p(.3,1,weapon.blade)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.716;
