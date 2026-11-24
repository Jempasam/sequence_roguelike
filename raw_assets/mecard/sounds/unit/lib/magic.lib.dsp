declare name "magic";
declare description "spells: a chime, a shimmer, a casting sweep";

import("sfx.lib");

chime(f, u) = sfx.inst.bell(f, u) * sfx.env.decay(2, u);
shimmer(u) = (os.osc(1900) + os.osc(2530) + os.osc(3170)) * 0.2 * sfx.env.fadeio(0.1, 0.7, u) * (0.6 + 0.4 * os.osc(11));
cast(f0, f1, u) = (no.noise : sfx.filter.sweep_bp(f0, f1, 2, u)) * 8 * sfx.env.fadeio(0.1, 0.5, u) + os.osc(sfx.env.sweep(f0 * 0.5, f1 * 0.5, u)) * 0.3 * sfx.env.fadeio(0.1, 0.5, u);
