declare name "pikeman";
declare description "a cry in chorus and a pole";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.5,human.cry(120)) + p(.1,.6,human.cry(135))*.7 + p(.4,1,weapon.whoosh)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.282;
