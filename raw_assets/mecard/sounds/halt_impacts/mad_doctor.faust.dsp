declare name "mad_doctor";
declare description "two heroes fused: discharge and flask, operation done";
declare duration "0.65";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
confirm = library("../lib/halt_voices/confirm.lib.dsp");
zap = library("../lib/halt_voices/zap.lib.dsp");

v0(u) = voice.filter(zap.sound, u);
v1(u) = voice.filter(\(u).(sfx.water.bubble(500,u)*1.5), u);
v2(u) = voice.filter(\(u).(sfx.water.bubble(600,u)*1.5), u);
v3(u) = voice.filter(confirm.sound, u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.4615, v0, t) * 0.6
    +     sfx.sequence.part(0.0000, 0.2308, v1, t) * 0.5
    +     sfx.sequence.part(0.2308, 0.4615, v2, t) * 0.5
    +     sfx.sequence.part(0.5385, 1.0000, v3, t) * 0.5
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
