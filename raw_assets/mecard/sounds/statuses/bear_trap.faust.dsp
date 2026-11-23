declare name "bear_trap";
declare description "a latch and a clang: jaws closing";
declare duration "0.35";

import("sfx.lib");

process(t) = sfx.mech.latch(t) * 0.8 + sfx.perc.clang(300, t) * 0.3;
