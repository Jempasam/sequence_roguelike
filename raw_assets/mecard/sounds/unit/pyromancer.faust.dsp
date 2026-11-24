declare name "pyromancer";
declare description "flame and crackles";
declare duration "0.8";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
element = library("lib/element.lib.dsp");
sizzle = library("../lib/halt_voices/sizzle.lib.dsp");

mix0(t) = (p(0,1,element.flame) + p(0,1,sfx.fire.ember)*.5 + p(0,1,sizzle.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.928;
