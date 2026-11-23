declare name "swift";
declare description "a fast rising whoosh";
declare duration "0.25";

import("sfx.lib");

process(t) = (no.noise : sfx.filter.sweep_bp(800, 5000, 2, t)) * sfx.env.fadeio(0.1, 0.6, t) * 0.6;
