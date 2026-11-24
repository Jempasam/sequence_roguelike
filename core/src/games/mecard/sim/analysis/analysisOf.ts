import type { Analysis, Anatomy } from "./Anatomy"
import { OrderedAnalysis } from "./OrderedAnalysis"
import { UnorderedAnalysis } from "./UnorderedAnalysis"

/** The analysis fit for a source: one that reads chains if it is ordered, else one that picks cards. */
export function analysisOf(anatomy: Anatomy): Analysis {
    return anatomy.ordered ? new OrderedAnalysis(anatomy) : new UnorderedAnalysis(anatomy)
}
