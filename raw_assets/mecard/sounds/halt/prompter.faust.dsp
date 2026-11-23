declare name "prompter";
declare description "two cards swapped: the whispered permutation, two cards changing place";
declare duration "1.5";

import("sfx.lib");

v0(u) = ((sfx.voice.babble(5,3,180,4,u) : sfx.filter.lpf(1800,.7)) * .6 + sfx.noise.hiss(2500) * .05) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.impact.cloth(0.5,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.impact.cloth(0.5,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.inst.pluck(ba.midikey2hz(64),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0, 0.5333, v0, t) * 0.3
    + sfx.sequence.part(0.5333, 0.7333, v1, t) * 0.5
    + sfx.sequence.part(0.6333, 0.8333, v2, t) * 0.5
    + sfx.sequence.part(0.6667, 1, v3, t) * 0.4
) : sfx.fx.reverb(0.9, 0.3) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t)) : *(2.3442);
