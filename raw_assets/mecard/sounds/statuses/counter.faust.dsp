declare name "counter";
declare description "a metal clang: a blow sent back";
declare duration "0.3";

import("sfx.lib");

process(t) = sfx.perc.clang(700, t) * 0.4;
