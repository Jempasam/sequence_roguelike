declare name "dark_trainer";
declare description "a boss ally joins: a muffled blow, chains put on";
declare duration "1.8";

import("sfx.lib");

v0(u) = (sfx.perc.kick(u) : sfx.filter.lpf(200,.7)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.sequence.euclid(6,8,0,sfx.impact.metal(2000,0.6),u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.perc.clang(120,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.2222, v0, t) * 0.8
    + sfx.sequence.part(0.2222, 0.7778, v1, t) * 0.4
    + sfx.sequence.part(0.7222, 1, v2, t) * 0.6
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(1.4289);
