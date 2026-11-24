declare name "explosive_goblin";
declare description "a nervous cackle, a fuse and a small boom";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
goblin = library("lib/goblin.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

mix0(t) = (p(0,.5,goblin.cackle(2,450)) + p(.35,.85,sizzle.sound)*.5 + p(.8,1,sfx.perc.boom)*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.995;
