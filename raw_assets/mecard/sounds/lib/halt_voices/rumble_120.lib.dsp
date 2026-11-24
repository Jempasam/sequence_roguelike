declare name "rumble_120";
declare description "a voice shared by the halts: sfx.noise.rumble(120)*sfx.env.decay(1.5,u)*4";
declare duration "1";

import("sfx.lib");

sound(t) = sfx.noise.rumble(120)*sfx.env.decay(1.5,t)*4;

process(t) = sound(t);
