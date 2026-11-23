declare name "rook";
declare description "a heavy low clang";
declare duration "0.4";

import("sfx.lib");

process(t) = sfx.perc.clang(250, t) * 0.4;
