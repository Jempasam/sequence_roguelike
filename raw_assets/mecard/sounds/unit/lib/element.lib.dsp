declare name "element";
declare description "the elements: flame, frost, earth, storm, leaves";

import("sfx.lib");

flame(u) = (sfx.fire.roar(u) * 0.12 + sfx.fire.sizzle(u) * 0.5) * sfx.env.fadeio(0.1, 0.5, u);
frost(u) = ((no.noise : sfx.filter.hpf(5000, 0.8)) * 0.5 * sfx.env.decay(4, u) + sfx.inst.bell(2093, u) * 0.4) * sfx.env.attack(0.02, u);
earth(u) = (no.noise : fi.lowpass(2, 400)) * 6 * sfx.env.decay(6, u) + os.osc(sfx.env.sweep(110, 50, u)) * sfx.env.decay(5, u);
storm(u) = sfx.mech.zap(u) * 0.5 + sfx.nature.thunder(u) * 1.2;
leaf(u) = sfx.life.leaves(u) * 0.8;
