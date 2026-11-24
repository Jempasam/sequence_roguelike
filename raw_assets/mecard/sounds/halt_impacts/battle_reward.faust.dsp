declare name "battle_reward";
declare description "a battle prize taken: gold, a short fanfare";
declare duration "0.75";

import("sfx.lib");

voice = library("../filters/voice.lib.dsp");
category = library("filters/impact.lib.dsp");
coin = library("../lib/halt_voices/coin.lib.dsp");
lead_72 = library("../lib/halt_voices/lead_72.lib.dsp");

v0(u) = voice.filter(coin.sound, u);
v1(u) = voice.filter(coin.sound, u);
v2(u) = voice.filter(coin.sound, u);
v3(u) = voice.filter(lead_72.sound, u);
v4(u) = voice.filter(sfx.inst.lead(ba.midikey2hz(79)), u);

mix(t) = (
    sfx.sequence.part(0.0000, 0.2667, v0, t) * 0.5
    +     sfx.sequence.part(0.1333, 0.4000, v1, t) * 0.5
    +     sfx.sequence.part(0.2667, 0.5333, v2, t) * 0.5
    +     sfx.sequence.part(0.4000, 0.6667, v3, t) * 0.6
    +     sfx.sequence.part(0.6000, 1.0000, v4, t) * 0.6
);

sound(t) = category.filter(mix, t);

process(t) = sound(t);
