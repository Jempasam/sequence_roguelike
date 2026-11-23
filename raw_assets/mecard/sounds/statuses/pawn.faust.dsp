declare name "pawn";
declare description "a small high clang";
declare duration "0.25";

import("sfx.lib");

process(t) = sfx.perc.clang(400, t) * 0.3;
