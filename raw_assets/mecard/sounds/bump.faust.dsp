declare name "bump";
declare description "two bodies colliding: a dull knock with a short metallic ring";
declare duration "0.25";

import("sfx.lib");

seed = hslider("seed", 1, 0, 9999, 1);

knock(t) = sfx.osc.sine(sfx.env.sweep(sfx.rand.pick(seed, 1, 160, 200), 70, t)) * sfx.env.decay(16, t);
ring(t) = sfx.osc.fm(sfx.rand.pick(seed, 2, 520, 680), 1.41, 2) * sfx.env.decay(18, t) * 0.25;

process(t) = (knock(t) + ring(t)) : sfx.fx.drive(1.4) : *(0.6);
