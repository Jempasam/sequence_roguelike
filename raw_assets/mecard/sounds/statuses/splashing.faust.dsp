declare name "splashing";
declare description "a big splash over a low slosh";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.nature.splash(t) * 0.5 + sfx.perc.tom(120, t) * 0.3;
