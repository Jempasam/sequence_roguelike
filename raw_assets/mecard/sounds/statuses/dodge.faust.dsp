declare name "dodge";
declare description "a fast airy whoosh: a blow avoided";
declare duration "0.25";

import("sfx.lib");

process(t) = (no.noise : sfx.filter.sweep_bp(2500, 900, 2, t)) * sfx.env.fadeio(0.2, 0.6, t) * 1.5 * 0.5;
