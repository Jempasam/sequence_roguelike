declare name "great_witch";
declare description "a potion given three times: three vials, a green flash and a choir";
declare duration "2.4";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");
pour = library("../lib/halt_voices/pour.lib.dsp");

v0(u) = voice.filter(pour.sound, u);
v1(u) = voice.filter(sfx.water.bubble(300), u);
v2(u) = voice.filter(pour.sound, u);
v3(u) = voice.filter(sfx.water.bubble(400), u);
v4(u) = voice.filter(pour.sound, u);
v5(u) = voice.filter(sfx.water.bubble(520), u);
v6(u) = voice.filter(\(u).((no.noise : sfx.filter.sweep_bp(300,5000,2,u)) * sfx.env.decay(2.5,u) * 6 + sfx.retro.powerup(u)), u);
v7(u) = voice.filter(\(u).((sfx.voice.ooh(ba.midikey2hz(64),u) + sfx.voice.ooh(ba.midikey2hz(67),u) + sfx.voice.ooh(ba.midikey2hz(71),u)) * 0.47), u);

mix(t) = (
    sfx.sequence.part(0, 0.25, v0, t) * 0.5
    + sfx.sequence.part(0.0625, 0.1875, v1, t) * 0.4
    + sfx.sequence.part(0.25, 0.5, v2, t) * 0.5
    + sfx.sequence.part(0.3125, 0.4375, v3, t) * 0.4
    + sfx.sequence.part(0.5, 0.75, v4, t) * 0.5
    + sfx.sequence.part(0.5625, 0.6875, v5, t) * 0.4
    + sfx.sequence.part(0.6667, 1, v6, t) * 0.4
    + sfx.sequence.part(0.6667, 1, v7, t) * 0.3
);

sound(t) = category.filter(mix, t) * 0.8511;

process(t) = sound(t);
