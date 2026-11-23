declare name "bubble";
declare description "a bubble: a drop of water";
declare duration "0.25";

import("sfx.lib");

process(t) = sfx.nature.drip(t) * 0.5;
