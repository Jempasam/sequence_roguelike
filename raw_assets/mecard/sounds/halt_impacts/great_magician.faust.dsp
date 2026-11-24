declare name "great_magician";
declare description "cards given: drum roll, a wider appearance";
declare duration "1.15";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
pluck_72 = library("../lib/halt_voices/pluck_72.lib.dsp");
pluck_79 = library("../lib/halt_voices/pluck_79.lib.dsp");
tom_150 = library("../lib/halt_voices/tom_150.lib.dsp");

v0(u) = voice.filter(tom_150.sound, u);
v1(u) = voice.filter(tom_150.sound, u);
v2(u) = voice.filter(tom_150.sound, u);
v3(u) = voice.filter(tom_150.sound, u);
v4(u) = voice.filter(pluck_72.sound, u);
v5(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(74)), u);
v6(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(76)), u);
v7(u) = voice.filter(pluck_79.sound, u);
v8(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(81)), u);
v9(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(84)), u);
v10(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(88)), u);
v11(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(91)), u);

mix(t) = (
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
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
