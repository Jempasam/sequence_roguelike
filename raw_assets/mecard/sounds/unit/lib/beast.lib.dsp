declare name "beast";
declare description "the cries of animals: a growl, a snort, a screech, a neigh, a howl";

import("sfx.lib");

growl(f, u) = (sfx.voice.grunt(f, u) * 0.9 + (no.noise : sfx.filter.bpf(f * 3, 1.5)) * sfx.env.decay(5, u) * 1.2) * sfx.env.fadeio(0.05, 0.4, u);
snort(u) = (no.noise : sfx.filter.bpf(sfx.env.sweep(1400, 500, u), 1.2)) * 6 * sfx.env.attack(0.05, u) * sfx.env.decay(7, u);
screech(f, u) = (os.sawtooth(sfx.env.sweep(f, f * 1.7, u)) : sfx.filter.bpf(f * 2.2, 3)) * 2 * sfx.env.fadeio(0.05, 0.5, u);
neigh(f, u) = sfx.voice.say(0, 1, sfx.env.sweep(f * 1.3, f * 0.7, u) * (1 + 0.04 * os.osc(18)), u);
howl(f, u) = sfx.life.wolf(f, u) * 2;
