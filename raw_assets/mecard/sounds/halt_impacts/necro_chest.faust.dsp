declare name "necro_chest";
declare description "a cursed card given: slow creak, bones falling";
declare duration "0.85";

import("sfx.lib");

v0(u) = (sfx.mech.creak(u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.wood(700,.9,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.wood(700,.9,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.impact.wood(700,.9,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.6471, v0, t) * 0.8
    +     sfx.sequence.part(0.3529, 0.4706, v1, t) * 0.6
    +     sfx.sequence.part(0.4706, 0.5882, v2, t) * 0.6
    +     sfx.sequence.part(0.5882, 0.7059, v3, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
