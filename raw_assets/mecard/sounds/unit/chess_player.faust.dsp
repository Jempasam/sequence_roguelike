declare name "chess_player";
declare description "a piece set down and a tick";
declare duration "0.5";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
bell_88 = library("../lib/halt_voices/bell_88.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");
wood_900 = library("../lib/halt_voices/wood_900.lib.dsp");

mix0(t) = (p(0,.3,wood_900.sound) + p(.25,.5,click_04.sound) + p(.4,1,bell_88.sound)*.3) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.084;
