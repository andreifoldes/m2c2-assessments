import { Game, ScoringProvider, ActivityKeyValueData } from "@m2c2kit/core";
/**
 * Color Dots is cued-recall, item-location memory binding task, where after
 * viewing 3 dots for a brief period of time, participants report: (1) the
 * color at a cued location; (2) the location of a cued color.
 */
declare class ColorDots extends Game implements ScoringProvider {
    constructor();
    initialize(): Promise<void>;
    calculateScores(data: ActivityKeyValueData[], extras: {
        numberOfTrials: number;
        dotDiameter: number;
    }): import("@m2c2kit/data-calc").Observation[];
}
export { ColorDots };
//# sourceMappingURL=index.d.ts.map