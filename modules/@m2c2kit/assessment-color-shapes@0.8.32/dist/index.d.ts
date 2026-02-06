import { Game, ScoringProvider, ActivityKeyValueData } from "@m2c2kit/core";
/**
 * Color Shapes is a visual array change detection task, measuring intra-item
 * feature binding, where participants determine if shapes change color across
 * two sequential presentations of shape stimuli.
 */
declare class ColorShapes extends Game implements ScoringProvider {
    constructor();
    initialize(): Promise<void>;
    calculateScores(data: ActivityKeyValueData[], extras: {
        numberOfTrials: number;
    }): import("@m2c2kit/data-calc").Observation[];
    private makeShapes;
}
export { ColorShapes };
//# sourceMappingURL=index.d.ts.map