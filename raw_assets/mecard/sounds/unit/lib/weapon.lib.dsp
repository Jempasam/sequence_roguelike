declare name "weapon";
declare description "arms: a blade, a clang, a bowstring, a shot, a whoosh";

import("sfx.lib");

blade(u) = sfx.impact.blade(2300, 0.9, u) * 0.6 * sfx.env.decay(2, u);
clang(u) = sfx.perc.clang(520, u) * 0.8;
twang(f, u) = sfx.inst.pluck(f, u) * sfx.env.decay(3, u) * 1.2;
shot(u) = (no.noise : fi.lowpass(2, 1800)) * 3 * sfx.env.decay(14, u) + sfx.perc.boom(u) * 0.6;
whoosh(u) = (no.noise : sfx.filter.sweep_bp(500, 3000, 1.2, u)) * 8 * sfx.env.fadeio(0.2, 0.5, u);
