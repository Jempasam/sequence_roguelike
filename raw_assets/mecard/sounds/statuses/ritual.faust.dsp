declare name "ritual";
declare description "a low ritual bell";
declare duration "0.8";

import("sfx.lib");

process(t) = sfx.perc.clang(220, t) * 0.35 : sfx.fx.reverb(0.85, 0.35);
