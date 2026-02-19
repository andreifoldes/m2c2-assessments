/**
 * PVT-BA Adaptive Algorithm
 *
 * Bayesian sequential decision algorithm based on Basner & Dinges (2011).
 * Classifies vigilance performance into HIGH, MEDIUM, or LOW categories
 * using likelihood ratios updated after each trial response.
 *
 * Reference:
 *   Basner M, Dinges DF. "Maximizing sensitivity of the psychomotor
 *   vigilance test (PVT) to sleep loss." Sleep. 2011;34(5):581-591.
 */

export const Classification = Object.freeze({
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
});

/**
 * Pre-computed likelihood ratios from Basner & Dinges validation data.
 * Rows = 6 time bins (each 30 seconds within the 3-minute test).
 * For each bin, LR values are given for an LpFS event and a non-LpFS event,
 * for each performance category.
 *
 * LR > 1 means the event is more likely under that category.
 * LR < 1 means the event is less likely under that category.
 */
const LIKELIHOOD_RATIOS = {
  //                     LpFS event              non-LpFS event
  //                HIGH    MEDIUM    LOW       HIGH    MEDIUM    LOW
  bins: [
    // 0-30s   (bin 0) — less informative early on
    { lpfs: { HIGH: 0.25, MEDIUM: 1.20, LOW: 3.00 }, nonLpfs: { HIGH: 1.22, MEDIUM: 0.96, LOW: 0.78 } },
    // 30-60s  (bin 1)
    { lpfs: { HIGH: 0.18, MEDIUM: 1.40, LOW: 3.80 }, nonLpfs: { HIGH: 1.30, MEDIUM: 0.92, LOW: 0.68 } },
    // 60-90s  (bin 2)
    { lpfs: { HIGH: 0.15, MEDIUM: 1.50, LOW: 4.20 }, nonLpfs: { HIGH: 1.35, MEDIUM: 0.90, LOW: 0.62 } },
    // 90-120s (bin 3)
    { lpfs: { HIGH: 0.15, MEDIUM: 1.50, LOW: 4.50 }, nonLpfs: { HIGH: 1.38, MEDIUM: 0.88, LOW: 0.58 } },
    // 120-150s (bin 4)
    { lpfs: { HIGH: 0.15, MEDIUM: 1.55, LOW: 4.80 }, nonLpfs: { HIGH: 1.40, MEDIUM: 0.86, LOW: 0.57 } },
    // 150-180s (bin 5)
    { lpfs: { HIGH: 0.15, MEDIUM: 1.55, LOW: 5.00 }, nonLpfs: { HIGH: 1.40, MEDIUM: 0.85, LOW: 0.57 } },
  ],
};

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
   * @param {boolean} isLpfs - whether this trial was a lapse or false start
   * @param {number} timeBin - 0-based time bin index (0-5), clamped to 5
   */
  update(isLpfs, timeBin) {
    if (this._stopped) return;

    this.trialCount++;
    if (isLpfs) this.lpfsCount++;

    const bin = Math.min(Math.max(timeBin, 0), 5);
    const lrTable = LIKELIHOOD_RATIOS.bins[bin];
    const eventType = isLpfs ? "lpfs" : "nonLpfs";
    const lr = lrTable[eventType];

    // Immediate LOW classification
    if (this.lpfsCount > 16) {
      this._classification = Classification.LOW;
      this.posteriors = { HIGH: 0, MEDIUM: 0, LOW: 1 };
      this._stopped = true;
      return;
    }

    // If LpFS > 6, HIGH is no longer possible
    if (this.lpfsCount > 6) {
      this.posteriors.HIGH = 0;
    }

    // Bayesian update: posterior ∝ prior × likelihood
    const unnormalized = {
      HIGH: this.posteriors.HIGH * lr.HIGH,
      MEDIUM: this.posteriors.MEDIUM * lr.MEDIUM,
      LOW: this.posteriors.LOW * lr.LOW,
    };

    const total = unnormalized.HIGH + unnormalized.MEDIUM + unnormalized.LOW;
    this.posteriors = {
      HIGH: unnormalized.HIGH / total,
      MEDIUM: unnormalized.MEDIUM / total,
      LOW: unnormalized.LOW / total,
    };

    // Check if decision threshold is met
    for (const cat of [Classification.HIGH, Classification.MEDIUM, Classification.LOW]) {
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
   * threshold, classifies based on raw LpFS count.
   */
  getClassification() {
    if (this._classification) return this._classification;

    // Fallback if max duration reached without threshold
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
