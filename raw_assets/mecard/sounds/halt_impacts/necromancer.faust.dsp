declare name "necromancer";
declare description "loot hearts received: heartbeats, a veiled bell";
declare duration "1";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
kick = library("../lib/halt_voices/kick.lib.dsp");

v0(u) = voice.filter(kick.sound, u);
v1(u) = voice.filter(kick.sound, u);
v2(u) = voice.filter(sfx.inst.bell(ba.midikey2hz(60)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2500, v0, t) * 0.8
    +     sfx.sequence.part(0.3000, 0.5500, v1, t) * 0.6
    +     sfx.sequence.part(0.6000, 1.0000, v2, t) * 0.7
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
