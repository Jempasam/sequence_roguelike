declare name "elite_reward";
declare description "an elite prize taken: a drum, a burst of gold, a three note fanfare";
declare duration "1.05";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");
lead_67 = library("../lib/halt_voices/lead_67.lib.dsp");
tom_100 = library("../lib/halt_voices/tom_100.lib.dsp");

v0(u) = voice.filter(tom_100.sound, u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(coin.sound, u);
v4(u) = voice.filter(coin.sound, u);
v5(u) = voice.filter(coin.sound, u);
v6(u) = voice.filter(coin.sound, u);
v7(u) = voice.filter(lead_67.sound, u);
v8(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(71)), u);
v9(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(74)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.1905, v0, t) * 0.7
    +     sfx.sequence.part(0.0952, 0.2857, v1, t) * 0.4
    +     sfx.sequence.part(0.1429, 0.3333, v2, t) * 0.4
    +     sfx.sequence.part(0.1905, 0.3810, v3, t) * 0.4
    +     sfx.sequence.part(0.2381, 0.4286, v4, t) * 0.4
    +     sfx.sequence.part(0.2857, 0.4762, v5, t) * 0.4
    +     sfx.sequence.part(0.3333, 0.5238, v6, t) * 0.4
    +     sfx.sequence.part(0.3333, 0.7143, v7, t) * 0.6
    +     sfx.sequence.part(0.4762, 0.8571, v8, t) * 0.6
    +     sfx.sequence.part(0.6190, 1.0000, v9, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
