declare name "ghost";
declare description "the plaint of a ghost: a choir note that sinks, trembling";

import("sfx.lib");

wail(f, u) = sfx.voice.ooh(sfx.env.sweep(f * 1.1, f * 0.85, u), u) : sfx.fx.tremolo(6, 0.5);
scream(f, u) = sfx.voice.choir_v(0, sfx.env.sweep(f * 0.8, f * 1.6, u), u) : sfx.fx.tremolo(9, 0.4);
breath(u) = (no.noise : sfx.filter.hpf(2500, 0.8)) * sfx.env.fadeio(0.3, 0.5, u) * 1.5;
