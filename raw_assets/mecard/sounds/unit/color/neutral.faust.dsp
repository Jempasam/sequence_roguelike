declare name "neutral";
declare description "a plain breath and a knock";
declare duration "0.5";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
weapon = library("../lib/weapon.lib.dsp");
thud = library("../../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.5,weapon.whoosh)*.3 + p(.2,1,thud.sound)*.7) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.473;
