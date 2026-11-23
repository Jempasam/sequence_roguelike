declare name "great_merchant";
declare description "an item given three times: a rain of gold, the big deal gong";
declare duration "2.4";

import("sfx.lib");

v0(u) = ((sfx.noise.crackle(.1) : sfx.filter.bpf(4500,1.5)) * sfx.env.decay(2.5,u) * 2) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.orient.gong(110,u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.impact.cloth(0.5,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.5
    + sfx.sequence.part(0.125, 0.25, v1, t) * 0.5
    + sfx.sequence.part(0.2083, 0.3333, v2, t) * 0.5
    + sfx.sequence.part(0.2917, 0.4167, v3, t) * 0.5
    + sfx.sequence.part(0.4167, 1, v4, t) * 0.7
    + sfx.sequence.part(0.4167, 0.5417, v5, t) * 0.3
) : sfx.fx.reverb(0.5, 0.1) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.7179);
