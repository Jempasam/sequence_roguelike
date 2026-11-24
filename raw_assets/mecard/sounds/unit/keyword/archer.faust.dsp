declare name "archer";
declare description "any shooter: a string";
declare duration "0.5";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");
weapon = library("../lib/weapon.lib.dsp");

mix0(t) = (p(0,.7,weapon.twang(300)) + p(.2,.8,weapon.whoosh)*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.367;
