declare name "orc_battle_shaman";
declare description "war drums and a howl";
declare duration "1";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
human = library("lib/human.lib.dsp");
size = library("filters/size.lib.dsp");
tom_60 = library("../lib/halt_voices/tom_60.lib.dsp");

mix0(t) = (p(0,.25,tom_60.sound) + p(.3,.55,tom_60.sound) + p(.6,.85,tom_60.sound) + p(.2,1,human.deep_cry(80))) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };
mix1(t) = size.filter(1.4, mix0, t);

process(t) = finish.filter(0.4, 0.4, mix1, t) * 0.537;
