declare name "beast_warrior";
declare description "a half-human half-beast cry";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
human = library("lib/human.lib.dsp");

mix0(t) = (p(0,.7,human.cry(130)) + p(0,.8,beast.growl(110))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.668;
