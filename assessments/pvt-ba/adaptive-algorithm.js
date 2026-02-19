/**
 * PVT-BA Adaptive Algorithm
 *
 * Bayesian sequential decision algorithm based on:
 *   Basner M. "Ultra-short objective alertness assessment: an adaptive
 *   duration version of the 3 minute PVT (PVT-BA) accurately tracks
 *   changes in psychomotor vigilance induced by sleep restriction."
 *   Sleep Advances. 2022;3(1):zpac038.
 *
 * Classifies vigilance performance into HIGH, MEDIUM, or LOW categories.
 * Uses odds-form Bayesian updates (equations 1-5 from the paper) with
 * likelihood ratios computed only for HIGH and LOW; MEDIUM is derived
 * as the residual probability.
 */

export const Classification = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
});

/**
 * Likelihood ratios from the PVT-BA paper (Figure 1, Basner 2022).
 * Per the paper, only LRs for HIGH and LOW are used.
 * Rows = 6 time bins (each 30 s within the 3-minute test).
 *
 * LR > 1 means the event is more likely under that category.
 * LR < 1 means the event is less likely under that category.
 *
 * From the paper's Results:
 *   - LpFS increased LOW likelihood 3-5x, decreased HIGH by 75-85%
 *   - Non-LpFS decreased LOW likelihood by 22-43%, increased HIGH by 22-40%
 *   - LRs during first 30s were closer to 1 (less informative)
 */
const LIKELIHOOD_RATIOS = [
  // 0-30s (bin 0) — less informative early on
  { lpfs: { HIGH: 0.25, LOW: 3.00 }, nonLpfs: { HIGH: 1.22, LOW: 0.78 } },
  // 30-60s (bin 1)
  { lpfs: { HIGH: 0.18, LOW: 3.80 }, nonLpfs: { HIGH: 1.30, LOW: 0.68 } },
  // 60-90s (bin 2)
  { lpfs: { HIGH: 0.15, LOW: 4.20 }, nonLpfs: { HIGH: 1.35, LOW: 0.62 } },
  // 90-120s (bin 3)
  { lpfs: { HIGH: 0.15, LOW: 4.50 }, nonLpfs: { HIGH: 1.38, LOW: 0.58 } },
  // 120-150s (bin 4)
  { lpfs: { HIGH: 0.15, LOW: 4.80 }, nonLpfs: { HIGH: 1.40, LOW: 0.57 } },
  // 150-180s (bin 5)
  { lpfs: { HIGH: 0.15, LOW: 5.00 }, nonLpfs: { HIGH: 1.40, LOW: 0.57 } },
];

export class AdaptiveAlgorithm {
  constructor(decisionThreshold = 0.99619) {
    this.decisionThreshold = decisionThreshold;
    this.posteriors = { HIGH: 1 / 3, MEDIUM: 1 / 3, LOW: 1 / 3 };
    this.lpfsCount = 0;
    this.trialCount = 0;
    this._classification = null;
    this._stopped = false;
  }

  /**
   * Update posteriors using the odds-form Bayesian approach from the paper.
   *
   * Algorithm per the paper (equations 1-5):
   *  1. Compute prior odds for HIGH and LOW
   *  2. Multiply by LR to get posterior odds
   *  3. Convert back to posterior probability
   *  4. MEDIUM = 1 - HIGH - LOW
   *  5. If cumulative LpFS > 6: set HIGH = 0, rescale MEDIUM and LOW
   *  6. If cumulative LpFS > 16: stop, classify LOW
   *  7. Check decision threshold
   *
   * @param {boolean} isLpfs - whether this trial was a lapse or false start
   * @param {number} timeBin - 0-based time bin index (0-5), clamped to 5
   */
  update(isLpfs, timeBin) {
    if (this._stopped) return;

    this.trialCount++;
    if (isLpfs) this.lpfsCount++;

    const bin = Math.min(Math.max(timeBin, 0), 5);
    const lr = LIKELIHOOD_RATIOS[bin][isLpfs ? "lpfs" : "nonLpfs"];

    // Equations 1-2: odds-form Bayesian update for HIGH
    const priorOddsHigh = this.posteriors.HIGH / (1 - this.posteriors.HIGH);
    const postOddsHigh = priorOddsHigh * lr.HIGH;
    this.posteriors.HIGH = postOddsHigh / (1 + postOddsHigh);

    // Equations 1-2: odds-form Bayesian update for LOW
    const priorOddsLow = this.posteriors.LOW / (1 - this.posteriors.LOW);
    const postOddsLow = priorOddsLow * lr.LOW;
    this.posteriors.LOW = postOddsLow / (1 + postOddsLow);

    // Equation 3: MEDIUM is the residual
    this.posteriors.MEDIUM = Math.max(
      0,
      1 - this.posteriors.HIGH - this.posteriors.LOW,
    );

    // Equations 4-5: if cumulative LpFS > 6, HIGH is impossible
    if (this.lpfsCount > 6) {
      this.posteriors.HIGH = 0;
      const medLowSum = this.posteriors.MEDIUM + this.posteriors.LOW;
      if (medLowSum > 0) {
        this.posteriors.MEDIUM = this.posteriors.MEDIUM / medLowSum;
        this.posteriors.LOW = this.posteriors.LOW / medLowSum;
      }
    }

    // If cumulative LpFS > 16, immediately classify LOW
    if (this.lpfsCount > 16) {
      this._classification = Classification.LOW;
      this.posteriors = { HIGH: 0, MEDIUM: 0, LOW: 1 };
      this._stopped = true;
      return;
    }

    // Check decision threshold
    for (const cat of [
      Classification.HIGH,
      Classification.MEDIUM,
      Classification.LOW,
    ]) {
      if (this.posteriors[cat] >= this.decisionThreshold) {
        this._classification = cat;
        this._stopped = true;
        return;
      }
    }
  }

  shouldStop() {
    return this._stopped;
  }

  /**
   * Returns the classification. If the algorithm hasn't stopped via
   * threshold, classifies based on raw LpFS count (always correct
   * per the paper since the full 3 min elapsed).
   */
  getClassification() {
    if (this._classification) return this._classification;

    if (this.lpfsCount <= 6) return Classification.HIGH;
    if (this.lpfsCount <= 16) return Classification.MEDIUM;
    return Classification.LOW;
  }

  getPosteriors() {
    return { ...this.posteriors };
  }

  getLpfsCount() {
    return this.lpfsCount;
  }

  getTrialCount() {
    return this.trialCount;
  }

  /**
   * Computes the 0-based time bin for a given elapsed time in ms.
   * Each bin is 30 seconds. Returns 0-5 (clamped).
   */
  static timeBinFromElapsed(elapsedMs) {
    return Math.min(Math.floor(elapsedMs / 30000), 5);
  }
}
