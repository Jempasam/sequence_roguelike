declare name "shadow_thief";
declare description "muffled steps and a coin";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
cloth_05 = library("../lib/halt_voices/cloth_05.lib.dsp");
coin_drop = library("../lib/halt_voices/coin_drop.lib.dsp");

mix0(t) = (p(0,.4,cloth_05.sound) + p(.4,1,coin_drop.sound)*.4) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.531;
