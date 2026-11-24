declare name "assassin";
declare description "a stealthy blade";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
weapon = library("lib/weapon.lib.dsp");
hollow = library("filters/hollow.lib.dsp");
cloth_06 = library("../lib/halt_voices/cloth_06.lib.dsp");

mix0(t) = (p(0,.3,cloth_06.sound) + p(.2,.6,weapon.blade)*.8) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = hollow.filter(mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 1.175;
