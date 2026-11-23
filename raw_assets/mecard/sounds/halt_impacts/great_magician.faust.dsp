declare name "great_magician";
declare description "cards given: drum roll, a wider appearance";
declare duration "1.15";

import("sfx.lib");

v0(u) = (sfx.perc.tom(150,u)) * sfx.env.fadeio(.002, .1, u);
v1(u) = (sfx.perc.tom(150,u)) * sfx.env.fadeio(.002, .1, u);
v2(u) = (sfx.perc.tom(150,u)) * sfx.env.fadeio(.002, .1, u);
v3(u) = (sfx.perc.tom(150,u)) * sfx.env.fadeio(.002, .1, u);
v4(u) = (sfx.inst.pluck(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v5(u) = (sfx.inst.pluck(ba.midikey2hz(74),u)) * sfx.env.fadeio(.002, .1, u);
v6(u) = (sfx.inst.pluck(ba.midikey2hz(76),u)) * sfx.env.fadeio(.002, .1, u);
v7(u) = (sfx.inst.pluck(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);
v8(u) = (sfx.inst.pluck(ba.midikey2hz(81),u)) * sfx.env.fadeio(.002, .1, u);
v9(u) = (sfx.inst.pluck(ba.midikey2hz(84),u)) * sfx.env.fadeio(.002, .1, u);
v10(u) = (sfx.inst.pluck(ba.midikey2hz(88),u)) * sfx.env.fadeio(.002, .1, u);
v11(u) = (sfx.inst.pluck(ba.midikey2hz(91),u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.0870, v0, t) * 0.6
    +     sfx.sequence.part(0.0609, 0.1478, v1, t) * 0.6
    +     sfx.sequence.part(0.1217, 0.2087, v2, t) * 0.6
    +     sfx.sequence.part(0.1826, 0.2696, v3, t) * 0.6
    +     sfx.sequence.part(0.2609, 0.5217, v4, t) * 0.7
    +     sfx.sequence.part(0.3304, 0.5913, v5, t) * 0.7
    +     sfx.sequence.part(0.4000, 0.6609, v6, t) * 0.7
    +     sfx.sequence.part(0.4696, 0.7304, v7, t) * 0.7
    +     sfx.sequence.part(0.5391, 0.8000, v8, t) * 0.7
    +     sfx.sequence.part(0.6087, 0.8696, v9, t) * 0.7
    +     sfx.sequence.part(0.6783, 0.9391, v10, t) * 0.7
    +     sfx.sequence.part(0.7478, 1.0087, v11, t) * 0.7
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
