declare name "great_merchant";
declare description "an item given three times: a rain of gold, the big deal gong";
declare duration "0.95";

import("sfx.lib");

v0(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = (sfx.retro.coin(u)) * sfx.env.fadeio(.002, .1, u);
v7(u) = (sfx.orient.gong(300,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2105, v0, t) * 0.4
    +     sfx.sequence.part(0.0737, 0.2842, v1, t) * 0.4
    +     sfx.sequence.part(0.1474, 0.3579, v2, t) * 0.4
    +     sfx.sequence.part(0.2211, 0.4316, v3, t) * 0.4
    +     sfx.sequence.part(0.2947, 0.5053, v4, t) * 0.4
    +     sfx.sequence.part(0.3684, 0.5789, v5, t) * 0.4
    +     sfx.sequence.part(0.4421, 0.6526, v6, t) * 0.4
    +     sfx.sequence.part(0.5263, 1.0000, v7, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
