declare name "monster_looting_reward";
declare description "monster loot taken: the bag falls, gold found, a hesitant joy";
declare duration "0.75";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");
thud = library("../lib/halt_voices/thud.lib.dsp");

v0(u) = voice.filter(thud.sound, u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(sfx.inst.marimba(ba.midikey2hz(71)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2667, v0, t) * 0.8
    +     sfx.sequence.part(0.2000, 0.4667, v1, t) * 0.5
    +     sfx.sequence.part(0.3333, 0.6000, v2, t) * 0.5
    +     sfx.sequence.part(0.5333, 1.0000, v3, t) * 0.8
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
