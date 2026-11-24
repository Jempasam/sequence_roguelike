declare name "mannequin";
declare description "a dull knock of wood";
declare duration "0.4";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");
wood_900 = library("../lib/halt_voices/wood_900.lib.dsp");

mix0(t) = (p(0,.8,wood_900.sound) + p(0,.6,thud.sound)*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 1.318;
