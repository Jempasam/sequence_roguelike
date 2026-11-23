declare name "dark_trainer";
declare description "a boss ally joins: a muffled blow, chains put on";
declare duration "0.6";

import("sfx.lib");

v0(u) = (sfx.perc.thud(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.scrape(900,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.metal(700,.8,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.2500, v0, t) * 0.8
    +     sfx.sequence.part(0.2500, 0.9167, v1, t) * 0.6
    +     sfx.sequence.part(0.2500, 1.0000, v2, t) * 0.4
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
