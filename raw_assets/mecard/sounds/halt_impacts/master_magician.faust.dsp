declare name "master_magician";
declare description "rare cards given: roll, harp and marimba, final flash";
declare duration "1.35";

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
v12(u) = (sfx.inst.marimba(ba.midikey2hz(60),u)) * sfx.env.fadeio(.002, .1, u);
v13(u) = (sfx.inst.marimba(ba.midikey2hz(62),u)) * sfx.env.fadeio(.002, .1, u);
v14(u) = (sfx.inst.marimba(ba.midikey2hz(64),u)) * sfx.env.fadeio(.002, .1, u);
v15(u) = (sfx.inst.marimba(ba.midikey2hz(67),u)) * sfx.env.fadeio(.002, .1, u);
v16(u) = (sfx.inst.marimba(ba.midikey2hz(69),u)) * sfx.env.fadeio(.002, .1, u);
v17(u) = (sfx.inst.marimba(ba.midikey2hz(72),u)) * sfx.env.fadeio(.002, .1, u);
v18(u) = (sfx.inst.marimba(ba.midikey2hz(76),u)) * sfx.env.fadeio(.002, .1, u);
v19(u) = (sfx.inst.marimba(ba.midikey2hz(79),u)) * sfx.env.fadeio(.002, .1, u);
v20(u) = (sfx.osc.fm(2093,1.41,1)*sfx.env.decay(7,u)*sfx.env.attack(.02,u)) * sfx.env.fadeio(.002, .1, u);

process(t) = (
    sfx.sequence.part(0.0000, 0.0741, v0, t) * 0.6
    +     sfx.sequence.part(0.0519, 0.1259, v1, t) * 0.6
    +     sfx.sequence.part(0.1037, 0.1778, v2, t) * 0.6
    +     sfx.sequence.part(0.1556, 0.2296, v3, t) * 0.6
    +     sfx.sequence.part(0.2222, 0.4444, v4, t) * 0.6
    +     sfx.sequence.part(0.2815, 0.5037, v5, t) * 0.6
    +     sfx.sequence.part(0.3407, 0.5630, v6, t) * 0.6
    +     sfx.sequence.part(0.4000, 0.6222, v7, t) * 0.6
    +     sfx.sequence.part(0.4593, 0.6815, v8, t) * 0.6
    +     sfx.sequence.part(0.5185, 0.7407, v9, t) * 0.6
    +     sfx.sequence.part(0.5778, 0.8000, v10, t) * 0.6
    +     sfx.sequence.part(0.6370, 0.8593, v11, t) * 0.6
    +     sfx.sequence.part(0.2222, 0.4444, v12, t) * 0.6
    +     sfx.sequence.part(0.2815, 0.5037, v13, t) * 0.6
    +     sfx.sequence.part(0.3407, 0.5630, v14, t) * 0.6
    +     sfx.sequence.part(0.4000, 0.6222, v15, t) * 0.6
    +     sfx.sequence.part(0.4593, 0.6815, v16, t) * 0.6
    +     sfx.sequence.part(0.5185, 0.7407, v17, t) * 0.6
    +     sfx.sequence.part(0.5778, 0.8000, v18, t) * 0.6
    +     sfx.sequence.part(0.6370, 0.8593, v19, t) * 0.6
    +     sfx.sequence.part(0.5926, 1.0000, v20, t) * 0.3
) : sfx.fx.reverb(.6,.08) : sfx.fx.dcblock : *(sfx.env.fadeio(.004, .12, t));
