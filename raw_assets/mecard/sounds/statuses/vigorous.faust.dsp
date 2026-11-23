declare name "vigorous";
declare description "a punchy rising power note";
declare duration "0.35";

import("sfx.lib");

process(t) = sfx.osc.sine(sfx.env.sweep(120, 220, t)) * sfx.env.fadeio(0.05, 0.6, t) * 0.4 + sfx.osc.sine(sfx.env.sweep(240, 440, t)) * sfx.env.fadeio(0.05, 0.6, t) * 0.15;
