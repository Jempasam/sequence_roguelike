declare name "status_end";
declare description "a magic bloop fading away: the same note gliding down, quieter";
declare duration "0.28";

import("sfx.lib");

process(t) = sfx.osc.fm(sfx.env.sweep(700, 300, t), 2, 0.8) * sfx.env.fadeio(0.03, 0.7, t) * 0.28;
