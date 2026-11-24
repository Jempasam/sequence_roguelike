declare name "monster_archer";
declare description "a growl and a heavy arrow";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.4,beast.growl(110)) + p(.4,1,weapon.twang(180))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.318;
