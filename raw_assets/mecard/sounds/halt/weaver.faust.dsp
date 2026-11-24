declare name "weaver";
declare description "two cards woven: the shuttle twice, then the thread plucked taut";
declare duration "1.6";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/neutral.lib.dsp");

v0(u) = voice.filter(\(u).((no.noise : sfx.filter.sweep_bp(600,4000,2,u)) * sfx.env.decay(2.5,u) * 6), u);
v1(u) = voice.filter(\(u).((no.noise : sfx.filter.sweep_bp(4000,600,2,u)) * sfx.env.decay(2.5,u) * 6), u);
v2(u) = voice.filter(sfx.inst.pluck(ba.midikey2hz(88)), u);
v3(u) = voice.filter(\(u).(sfx.osc.fm(1200,1.41,2) * sfx.env.decay(5,u) * .5), u);

mix(t) = (
    sfx.sequence.part(0, 0.3125, v0, t) * 0.5
    + sfx.sequence.part(0.25, 0.5625, v1, t) * 0.5
    + sfx.sequence.part(0.5625, 0.8125, v2, t) * 0.6
    + sfx.sequence.part(0.5625, 1, v3, t) * 0.25
);

sound(t) = category.filter(mix, t) * 0.2661;

process(t) = sound(t);
