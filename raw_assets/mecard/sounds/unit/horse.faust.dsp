declare name "horse";
declare description "a short neigh and hooves";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,.8,beast.neigh(500)) + p(.7,.85,thud.sound)*.5 + p(.85,1,thud.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.708;
