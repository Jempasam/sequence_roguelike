declare name "archer";
declare description "a string and an arrow";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");

mix0(t) = (p(0,.6,weapon.twang(260)) + p(.2,.8,weapon.whoosh)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.279;
