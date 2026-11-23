declare name "bloodlust";
declare description "a growl swelling and rising";
declare duration "0.4";

import("sfx.lib");

process(t) = (sfx.osc.saw(sfx.env.sweep(80, 200, t)) : fi.lowpass(2, 800)) * sfx.env.fadeio(0.1, 0.6, t) * 0.4 : sfx.fx.drive(2);
