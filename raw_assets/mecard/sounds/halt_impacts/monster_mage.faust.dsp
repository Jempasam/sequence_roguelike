declare name "monster_mage";
declare description "a monster turned into a card: a roar, an arcane flash";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.voice.grunt(90,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.osc.fm(660,1.41,2)*sfx.env.decay(6,u)*sfx.env.attack(.02,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.8
    +     sfx.sequence.part(0.3846, 1.0000, v1, t) * 0.4
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
