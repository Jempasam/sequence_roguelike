declare name "prompter";
declare description "two cards swapped: the whispered permutation, two cards changing place";
declare duration "0.65";

import("sfx.lib");

v0(u) = (sfx.voice.babble(5,3,180,6,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.cloth(.6,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.cloth(.6,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.6
    +     sfx.sequence.part(0.4615, 0.7692, v1, t) * 0.8
    +     sfx.sequence.part(0.6154, 0.9231, v2, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
