declare name "werewolf";
declare description "a hoarse half-human howl";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
human = library("lib/human.lib.dsp");
size = library("filters/size.lib.dsp");

mix0(t) = (p(0,.4,human.deep_cry(110)) + p(0,.5,beast.growl(110)) + p(.35,1,beast.howl(300))*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.3, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.473;
