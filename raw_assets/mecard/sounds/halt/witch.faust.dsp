declare name "witch";
declare description "a potion given: poured, bubbling, a green flash";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");
pour = library("../lib/halt_voices/pour.lib.dsp");

v0(u) = voice.filter(pour.sound, u);
v1(u) = voice.filter(sfx.water.bubble(300), u);
v2(u) = voice.filter(sfx.water.bubble(450), u);
v3(u) = voice.filter(sfx.water.bubble(380), u);
v4(u) = voice.filter(\(u).((no.noise : sfx.filter.sweep_bp(300,5000,2,u)) * sfx.env.decay(2.5,u) * 6 + sfx.retro.powerup(u)), u);

mix(t) = (
    sfx.sequence.part(0, 0.5, v0, t) * 0.5
    + sfx.sequence.part(0.25, 0.4375, v1, t) * 0.4
    + sfx.sequence.part(0.3438, 0.5313, v2, t) * 0.4
    + sfx.sequence.part(0.4375, 0.625, v3, t) * 0.4
    + sfx.sequence.part(0.5625, 1, v4, t) * 0.4
);

sound(t) = category.filter(mix, t) * 0.861;

process(t) = sound(t);
