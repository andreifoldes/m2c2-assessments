import { Game, ScoringProvider, ActivityKeyValueData } from "@m2c2kit/core";
/**
 * Grid Memory is a visuospatial working memory task, with delayed free
 * recall. After a brief exposure, and a short distraction phase,
 * participants report the location of dots on a grid.
 */
declare class GridMemory extends Game implements ScoringProvider {
    constructor();
    initialize(): Promise<void>;
    calculateScores(data: ActivityKeyValueData[], extras: {
        numberOfDots: number;
        numberOfTrials: number;
    }): import("@m2c2kit/data-calc").Observation[];
}
export { GridMemory };
//# sourceMappingURL=index.d.ts.map