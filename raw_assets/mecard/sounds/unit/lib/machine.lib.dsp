declare name "machine";
declare description "machines: a whirr, a charge that climbs, a blast";

import("sfx.lib");

whirr(u) = sfx.mech.servo(u);
charge(u) = (os.sawtooth(sfx.env.sweep(120, 1200, u)) : sfx.filter.lpf(2500, 1)) * sfx.env.attack(0.05, u) * (1 - sfx.env.ramp(0.9, 1, u)) * 0.5;
blast(u) = sfx.mech.zap(u) * 0.6 + sfx.perc.boom(u) * 0.8;
beeps(f, n, u) = sfx.osc.square(f * (1 + sfx.env.tooth(n, u))) * 0.15 * (sfx.env.tooth(n, u) < 0.5) * sfx.env.fadeio(0.02, 0.1, u);
