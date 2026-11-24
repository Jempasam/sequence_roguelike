declare name "fire_lizard";
declare description "a hiss and crackles";
declare duration "0.6";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
beast = library("lib/beast.lib.dsp");
element = library("lib/element.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

mix0(t) = (p(0,1,element.flame)*.7 + p(0,.5,beast.growl(120))*.7 + p(0,1,sizzle.sound)*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.413;
