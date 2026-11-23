declare name "witch";
declare description "a potion given: poured, bubbling, a green flash";
declare duration "1.6";

import("sfx.lib");

v0(u) = (sfx.water.pour(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.water.bubble(300,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.water.bubble(450,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.water.bubble(380,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = ((no.noise : sfx.filter.sweep_bp(300,5000,2,u)) * sfx.env.decay(2.5,u) * 6 + sfx.retro.powerup(u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.5
    + sfx.sequence.part(0.25, 0.4375, v1, t) * 0.4
    + sfx.sequence.part(0.3438, 0.5313, v2, t) * 0.4
    + sfx.sequence.part(0.4375, 0.625, v3, t) * 0.4
    + sfx.sequence.part(0.5625, 1, v4, t) * 0.4
) : sfx.fx.reverb(0.6, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(0.861);
