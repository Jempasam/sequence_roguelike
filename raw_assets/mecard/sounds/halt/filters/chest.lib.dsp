declare name "chest";
declare description "the end of a halt in a medium room";

import("sfx.lib");

finish = library("../../filters/finish.lib.dsp");

filter(s, t) = finish.filter(0.6, 0.12, s, t);
