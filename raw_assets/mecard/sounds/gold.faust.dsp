declare name "gold";
declare description "a coin: two quick notes, the second one higher";
declare duration "0.4";

import("sfx.lib");

process(t) = sfx.retro.coin(t);
