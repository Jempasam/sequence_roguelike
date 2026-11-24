declare name "goblin_wrestler";
declare description "a taunt and a slap";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
goblin = library("lib/goblin.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.6,goblin.cackle(7,300)) + p(.5,1,thud.sound)*.8 + p(.5,.7,weapon.whoosh)*.1) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.912;
