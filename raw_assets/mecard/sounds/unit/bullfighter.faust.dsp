declare name "bullfighter";
declare description "an olé and a cape";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
pluck_67 = library("../lib/halt_voices/pluck_67.lib.dsp");

mix0(t) = (p(0,.3,human.hah(220)) + p(.2,.8,weapon.whoosh)*.3 + p(.6,1,pluck_67.sound)*.5) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.376;
