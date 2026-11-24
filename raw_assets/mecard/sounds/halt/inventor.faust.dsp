declare name "inventor";
declare description "a card given: the machine turns, the card comes out, success";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/workshop.lib.dsp");
pluck_72 = library("../lib/halt_voices/pluck_72.lib.dsp");
pluck_79 = library("../lib/halt_voices/pluck_79.lib.dsp");
servo = library("../lib/halt_voices/servo.lib.dsp");

v0(u) = voice.filter(servo.sound, u);
v1(u) = voice.filter(sfx.sequence.euclid(5,8,0,sfx.mech.click), u);
v2(u) = voice.filter(sfx.impact.metal(600,0.7), u);
v3(u) = voice.filter(sfx.impact.cloth(0.4), u);
v4(u) = voice.filter(pluck_72.sound, u);
v5(u) = voice.filter(pluck_79.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.4444, v0, t) * 0.5
    + sfx.sequence.part(0.0556, 0.5556, v1, t) * 0.4
    + sfx.sequence.part(0.5, 0.6667, v2, t) * 0.5
    + sfx.sequence.part(0.5556, 0.7778, v3, t) * 0.4
    + sfx.sequence.part(0.6667, 0.8333, v4, t) * 0.5
    + sfx.sequence.part(0.7778, 1, v5, t) * 0.5
);

sound(t) = category.filter(mix, t) * 0.7674;

process(t) = sound(t);
