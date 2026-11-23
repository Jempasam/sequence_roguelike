declare name "dark_magician";
declare description "a card given: drum roll, then a falling minor harp";
declare duration "0.95";

import("sfx.lib");

v0(u) = (sfx.perc.tom(100,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.tom(100,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.perc.tom(100,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.perc.tom(100,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.pluck(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.inst.pluck(ba.midikey2hz(75),u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = (sfx.inst.pluck(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v7(u) = (sfx.inst.pluck(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.1053, v0, t) * 0.6
    +     sfx.sequence.part(0.0737, 0.1789, v1, t) * 0.6
    +     sfx.sequence.part(0.1474, 0.2526, v2, t) * 0.6
    +     sfx.sequence.part(0.2211, 0.3263, v3, t) * 0.6
    +     sfx.sequence.part(0.3158, 0.6316, v4, t) * 0.8
    +     sfx.sequence.part(0.4211, 0.7368, v5, t) * 0.8
    +     sfx.sequence.part(0.5263, 0.8421, v6, t) * 0.8
    +     sfx.sequence.part(0.6316, 0.9474, v7, t) * 0.8
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
