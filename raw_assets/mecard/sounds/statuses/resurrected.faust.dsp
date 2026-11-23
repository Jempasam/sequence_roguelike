declare name "resurrected";
declare description "a choir rising from low to high";
declare duration "0.8";

import("sfx.lib");

process(t) = (sfx.osc.sine(sfx.env.sweep(200, 800, t)) * 0.12 + sfx.osc.sine(sfx.env.sweep(300, 1200, t)) * 0.08) * sfx.env.fadeio(0.2, 0.7, t) : sfx.fx.reverb(0.85, 0.4);
