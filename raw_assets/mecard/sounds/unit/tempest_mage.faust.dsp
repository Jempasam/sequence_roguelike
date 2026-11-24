declare name "tempest_mage";
declare description "lightning and thunder";
declare duration "0.9";

import("sfx.lib");

finish = library("../filters/finish.lib.dsp");
element = library("lib/element.lib.dsp");

mix0(t) = (p(0,1,element.storm)) with { p(a, b, f) = sfx.sequence.part(a, b, f, t); };

process(t) = finish.filter(0.4, 0.4, mix0, t) * 0.692;
