declare name "necromancer";
declare description "loot hearts received: heartbeats, a veiled bell";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/dark.lib.dsp");
rumble_120 = library("../lib/halt_voices/rumble_120.lib.dsp");
tom_60 = library("../lib/halt_voices/tom_60.lib.dsp");

v0(u) = voice.filter(tom_60.sound, u);
v1(u) = voice.filter(tom_60.sound, u);
v2(u) = voice.filter(tom_60.sound, u);
v3(u) = voice.filter(tom_60.sound, u);
v4(u) = voice.filter(\(u).(sfx.inst.bell(ba.midikey2hz(55),u) : sfx.filter.lpf(900,.7)), u);
v5(u) = voice.filter(rumble_120.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.1667, v0, t) * 0.7
    + sfx.sequence.part(0.1667, 0.3333, v1, t) * 0.6
    + sfx.sequence.part(0.4444, 0.6111, v2, t) * 0.7
    + sfx.sequence.part(0.6111, 0.7778, v3, t) * 0.6
    + sfx.sequence.part(0.5556, 1, v4, t) * 0.5
    + sfx.sequence.part(0, 1, v5, t) * 0.25
);

sound(t) = category.filter(mix, t) * 0.5888;

process(t) = sound(t);
