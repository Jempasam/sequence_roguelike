declare name "undead";
declare description "the dead: a rattle of bones and a hollow voice";

import("sfx.lib");

rattle(u) = (sfx.noise.crackle(0.05) : sfx.filter.bpf(2800, 2)) * sfx.env.decay(3, u) * 5;
hollow(f, u) = sfx.voice.elder_say(0, 5, sfx.env.sweep(f * 1.1, f * 0.8, u), u);
