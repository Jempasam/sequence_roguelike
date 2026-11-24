declare name "hunter";
declare description "a horn and an arrow";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
lead_67 = library("../lib/halt_voices/lead_67.lib.dsp");

mix0(t) = (p(0,.4,lead_67.sound)*.5 + p(.4,1,weapon.twang(330))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.622;
