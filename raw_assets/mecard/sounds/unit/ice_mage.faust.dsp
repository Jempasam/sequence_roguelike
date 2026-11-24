declare name "ice_mage";
declare description "a crystal frost";
declare duration "0.7";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
magic = library("lib/magic.lib.dsp");
element = library("lib/element.lib.dsp");

mix0(t) = (p(0,.9,element.frost) + p(.4,1,magic.chime(1320))*.6) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.776;
