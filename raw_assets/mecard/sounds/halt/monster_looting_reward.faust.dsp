declare name "monster_looting_reward";
declare description "monster loot taken: the bag falls, gold found, a hesitant joy";
declare duration "1.8";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/reward.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

v0(u) = voice.filter(sfx.impact.cloth(0.6), u);
v1(u) = voice.filter(thud.sound, u);
v2(u) = voice.filter(\(u).((sfx.noise.crackle(.05) : sfx.filter.bpf(4000,1.5)) * sfx.env.decay(2,u) * 2), u);
v3(u) = voice.filter(coin.sound, u);
v4(u) = voice.filter(sfx.inst.flute(ba.midikey2hz(64)), u);
v5(u) = voice.filter(sfx.inst.flute(ba.midikey2hz(67)), u);

mix(t) = (
    sfx.sequence.part(0, 0.1944, v0, t) * 0.7
    + sfx.sequence.part(0.0278, 0.1389, v1, t) * 0.5
    + sfx.sequence.part(0.2778, 0.5, v2, t) * 0.4
    + sfx.sequence.part(0.5, 0.7222, v3, t) * 0.4
    + sfx.sequence.part(0.6111, 0.8333, v4, t) * 0.4
    + sfx.sequence.part(0.7778, 1, v5, t) * 0.4
);

sound(t) = category.filter(mix, t) * 2.0893;

process(t) = sound(t);
