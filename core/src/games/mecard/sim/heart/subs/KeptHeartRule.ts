import { HeartRule } from "../HeartRule"
import { Heart } from "../Heart"

/** The rules of a heart kept as an empty place once lost, which healing fills again. */
export class KeptHeartRule extends HeartRule {


    public override onReplacement(heart: Heart): Heart {
        return new Heart(heart.kind, true)
    }

    public override heal(heart: Heart): boolean {
        if(!heart.isEmpty) return false
        heart.isEmpty = false
        return true
    }
}
