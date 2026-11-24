declare name "impact";
declare description "the end of a halt impact in a small, short room";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");

filter(s, t) = finish.filter(0.6, 0.08, s, t);
