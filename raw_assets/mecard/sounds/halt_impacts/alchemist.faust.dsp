declare name "alchemist";
declare description "two upgraded copies: the potion bubbles, a glass note per copy";
declare duration "0.95";

import("sfx.lib");

v0(u) = (sfx.water.bubble(450,u)*1.5) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.water.bubble(450,u)*1.5) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.water.bubble(450,u)*1.5) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.water.bubble(450,u)*1.5) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.bell(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.inst.bell(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.1263, v0, t) * 0.5
    +     sfx.sequence.part(0.1053, 0.2316, v1, t) * 0.5
    +     sfx.sequence.part(0.2105, 0.3368, v2, t) * 0.5
    +     sfx.sequence.part(0.3158, 0.4421, v3, t) * 0.5
    +     sfx.sequence.part(0.4737, 0.8421, v4, t) * 0.6
    +     sfx.sequence.part(0.6316, 1.0000, v5, t) * 0.6
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
