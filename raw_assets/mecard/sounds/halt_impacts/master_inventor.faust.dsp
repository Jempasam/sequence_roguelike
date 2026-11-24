declare name "master_inventor";
declare description "cards given: a stronger machine, a double success";
declare duration "1.15";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
click_04 = library("../lib/halt_voices/click_04.lib.dsp");
confirm = library("../lib/halt_voices/confirm.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

v0(u) = voice.filter(sfx.mech.engine(110), u);
v1(u) = voice.filter(zap.sound, u);
v2(u) = voice.filter(click_04.sound, u);
v3(u) = voice.filter(confirm.sound, u);
v4(u) = voice.filter(confirm.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4783, v0, t) * 0.5
    +     sfx.sequence.part(0.2609, 0.5217, v1, t) * 0.5
    +     sfx.sequence.part(0.4783, 0.5652, v2, t) * 0.6
    +     sfx.sequence.part(0.6087, 0.8696, v3, t) * 0.5
    +     sfx.sequence.part(0.7391, 1.0000, v4, t) * 0.5
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
