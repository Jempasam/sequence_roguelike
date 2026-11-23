declare name "giant";
declare description "a deep slow thump";
declare duration "0.5";

import("sfx.lib");

process(t) = sfx.perc.tom(70, t) * 0.6;
