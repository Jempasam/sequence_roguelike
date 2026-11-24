declare name "thorn_tank";
declare description "a rustle and spikes";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
element = library("lib/element.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

mix0(t) = (p(0,1,element.leaf) + p(.4,1,thud.sound)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.698;
