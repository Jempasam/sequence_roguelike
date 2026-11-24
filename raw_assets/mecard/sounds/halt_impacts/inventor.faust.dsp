declare name "inventor";
declare description "a card given: the machine turns, the card comes out, success";
declare duration "0.85";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");
confirm = library("../lib/halt_voices/confirm.lib.dsp");
servo = library("../lib/halt_voices/servo.lib.dsp");

v0(u) = voice.filter(servo.sound, u);
v1(u) = voice.filter(click_04.sound, u);
v2(u) = voice.filter(confirm.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4118, v0, t) * 0.6
    +     sfx.sequence.part(0.4118, 0.5294, v1, t) * 0.6
    +     sfx.sequence.part(0.5882, 1.0000, v2, t) * 0.5
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
