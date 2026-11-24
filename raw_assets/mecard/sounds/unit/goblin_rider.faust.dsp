declare name "goblin_rider";
declare description "a cackle and a gallop";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
goblin = library("lib/goblin.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.5,goblin.cackle(6,430)) + p(.4,.8,beast.neigh(500))*.7 + p(.75,.9,thud.sound)*.5 + p(.88,1,thud.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.059;
