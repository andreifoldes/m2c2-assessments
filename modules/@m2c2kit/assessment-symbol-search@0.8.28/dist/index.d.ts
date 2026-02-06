import { Game, ScoringProvider, ActivityKeyValueData } from "@m2c2kit/core";
/**
 * Symbol Search is a speeded continuous performance test of conjunctive
 * feature search in which respondents identify matching symbol pairs as
 * quickly and as accurately as they can.
 */
declare class SymbolSearch extends Game implements ScoringProvider {
    constructor();
    initialize(): Promise<void>;
    calculateScores(data: ActivityKeyValueData[], extras: {
        rtLowerBound: number;
        rtUpperBound: number;
        numberOfTrials: number;
    }): import("@m2c2kit/data-calc").Observation[];
    /**
     * Returns a new array with the items in random order.
     *
     * @param array - The array to shuffle
     * @returns A new array with the items in random order
     */
    private shuffleArray;
}
export { SymbolSearch };
//# sourceMappingURL=index.d.ts.map