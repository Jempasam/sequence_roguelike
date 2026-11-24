declare name "magician";
declare description "a card given: drum roll, then the card appears";
declare duration "0.95";

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
v5(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(76)), u);
v6(u) = voice.filter(pluck_79.sound, u);
v7(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(84)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1053, v0, t) * 0.6
    +     sfx.sequence.part(0.0737, 0.1789, v1, t) * 0.6
    +     sfx.sequence.part(0.1474, 0.2526, v2, t) * 0.6
    +     sfx.sequence.part(0.2211, 0.3263, v3, t) * 0.6
    +     sfx.sequence.part(0.3158, 0.6316, v4, t) * 0.8
    +     sfx.sequence.part(0.4211, 0.7368, v5, t) * 0.8
    +     sfx.sequence.part(0.5263, 0.8421, v6, t) * 0.8
    +     sfx.sequence.part(0.6316, 0.9474, v7, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
