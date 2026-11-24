declare name "mad_doctor";
declare description "two heroes fused: discharge and flask, operation done";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/magic.lib.dsp");
confirm = library("../lib/halt_voices/confirm.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

v0(u) = voice.filter(zap.sound, u);
v1(u) = voice.filter(sfx.water.bubble(300), u);
v2(u) = voice.filter(sfx.water.bubble(420), u);
v3(u) = voice.filter(confirm.sound, u);

mix(t) = (
    sfx.sequence.part(0, 0.2222, v0, t) * 0.7
    + sfx.sequence.part(0.2778, 0.4444, v1, t) * 0.5
    + sfx.sequence.part(0.3611, 0.5278, v2, t) * 0.5
    + sfx.sequence.part(0.7222, 0.9444, v3, t) * 0.5
);

sound(t) = category.filter(mix, t) * 1.7989;

process(t) = sound(t);
