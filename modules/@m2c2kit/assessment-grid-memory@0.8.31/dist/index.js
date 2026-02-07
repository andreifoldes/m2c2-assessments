import { Game, RandomDraws, Sprite, Scene, M2Error as M2Error$1, WebColors, LabelHorizontalAlignmentMode, Transition, Easings, TransitionDirection, Label, Action, Shape, Timer } from '@m2c2kit/core';
import { LocalePicker, Instructions, CountdownScene, Grid, Button } from '@m2c2kit/addons';

class M2Error extends Error {
  constructor(...params) {
    super(...params);
    this.name = "M2Error";
    Object.setPrototypeOf(this, M2Error.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, M2Error);
    }
  }
}
class DataCalc {
  /**
   * A class for transformation and calculation of m2c2kit data.
   *
   * @remarks The purpose is to provide a simple and intuitive interface for
   * assessments to score and summarize their own data. It is not meant for
   * data analysis or statistical modeling. The idiomatic approach is based on the
   * dplyr R package.
   *
   * @param data - An array of observations, where each observation is a set of
   * key-value pairs of variable names and values.
   * @param options - Options, such as groups to group the data by
   * @example
   * ```js
   * const dc = new DataCalc(gameData.trials);
   * const mean_response_time_correct_trials = dc
   *  .filter((obs) => obs.correct_response_index === obs.user_response_index)
   *  .summarize({ mean_rt: mean("response_time_duration_ms") })
   *  .pull("mean_rt");
   * ```
   */
  constructor(data, options) {
    this._groups = new Array();
    if (!Array.isArray(data)) {
      throw new M2Error(
        "DataCalc constructor expects an array of observations as first argument"
      );
    }
    for (let i = 0; i < data.length; i++) {
      if (data[i] === null || typeof data[i] !== "object" || Array.isArray(data[i])) {
        throw new M2Error(
          `DataCalc constructor expects all elements to be objects (observations). Element at index ${i} is ${typeof data[i]}. Element: ${JSON.stringify(data[i])}`
        );
      }
    }
    this._observations = this.deepCopy(data);
    const allVariables = /* @__PURE__ */ new Set();
    for (const observation of data) {
      for (const key of Object.keys(observation)) {
        allVariables.add(key);
      }
    }
    for (const observation of this._observations) {
      for (const variable of allVariables) {
        if (!(variable in observation)) {
          observation[variable] = null;
        }
      }
    }
    if (options?.groups) {
      this._groups = Array.from(options.groups);
    }
  }
  /**
   * Returns the groups in the data.
   */
  get groups() {
    return this._groups;
  }
  /**
   * Returns the observations in the data.
   *
   * @remarks An observation is conceptually similar to a row in a dataset,
   * where the keys are the variable names and the values are the variable values.
   */
  get observations() {
    return this._observations;
  }
  /**
   * Alias for the observations property.
   */
  get rows() {
    return this._observations;
  }
  /**
   * Returns a single variable from the data.
   *
   * @remarks If the variable length is 1, the value is returned. If the
   * variable has length > 1, an array of values is returned.
   *
   * @param variable - Name of variable to pull from the data
   * @returns the value of the variable
   *
   * @example
   * ```js
   * const d = [{ a: 1, b: 2, c: 3 }];
   * const dc = new DataCalc(d);
   * console.log(
   *   dc.pull("c")
   * ); // 3
   * ```
   */
  pull(variable) {
    if (this._observations.length === 0) {
      console.warn(
        `DataCalc.pull(): No observations available to pull variable "${variable}" from. Returning null.`
      );
      return null;
    }
    this.verifyObservationsContainVariable(variable);
    const values = this._observations.map((o) => o[variable]);
    if (values.length === 1) {
      return values[0];
    }
    return values;
  }
  /**
   * Returns the number of observations in the data.
   *
   * @example
   * ```js
   * const d = [
   *   { a: 1, b: 2, c: 3 },
   *   { a: 0, b: 8, c: 3 }
   * ];
   * const dc = new DataCalc(d);
   * console.log(
   *   dc.length
   * ); // 2
   * ```
   */
  get length() {
    return this._observations.length;
  }
  /**
   * Filters observations based on a predicate function.
   *
   * @param predicate - A function that returns true for observations to keep and
   * false for observations to discard
   * @returns A new `DataCalc` object with only the observations that pass the
   * predicate function
   *
   * @example
   * ```js
   * const d = [
   *   { a: 1, b: 2, c: 3 },
   *   { a: 0, b: 8, c: 3 },
   *   { a: 9, b: 4, c: 7 },
   * ];
   * const dc = new DataCalc(d);
   * console.log(dc.filter((obs) => obs.b >= 3).observations);
   * // [ { a: 0, b: 8, c: 3 }, { a: 9, b: 4, c: 7 } ]
   * ```
   */
  filter(predicate) {
    if (this._groups.length > 0) {
      throw new M2Error(
        `filter() cannot be used on grouped data. The data are currently grouped by ${this._groups.join(
          ", "
        )}. Ungroup the data first using ungroup().`
      );
    }
    return new DataCalc(
      this._observations.filter(
        predicate
      ),
      { groups: this._groups }
    );
  }
  /**
   * Groups observations by one or more variables.
   *
   * @remarks This is used with the `summarize()` method to calculate summaries
   * by group.
   *
   * @param groups - variable names to group by
   * @returns A new `DataCalc` object with the observations grouped by one or
   * more variables
   *
   * @example
   * ```js
   * const d = [
   *   { a: 1, b: 2, c: 3 },
   *   { a: 0, b: 8, c: 3 },
   *   { a: 9, b: 4, c: 7 },
   *   { a: 5, b: 0, c: 7 },
   * ];
   * const dc = new DataCalc(d);
   * const grouped = dc.groupBy("c");
   * // subsequent summarize operations will be performed separately by
   * // each unique level of c, in this case, 3 and 7
   * ```
   */
  groupBy(...groups) {
    groups.forEach((group) => {
      this.verifyObservationsContainVariable(group);
    });
    return new DataCalc(this._observations, { groups });
  }
  /**
   * Ungroups observations.
   *
   * @returns A new DataCalc object with the observations ungrouped
   */
  ungroup() {
    return new DataCalc(this._observations);
  }
  /**
   * Adds new variables to the observations based on the provided mutation options.
   *
   * @param mutations - An object where the keys are the names of the new variables
   * and the values are functions that take an observation and return the value
   * for the new variable.
   * @returns A new DataCalc object with the new variables added to the observations.
   *
   * @example
   * const d = [
   *   { a: 1, b: 2, c: 3 },
   *   { a: 0, b: 8, c: 3 },
   *   { a: 9, b: 4, c: 7 },
   * ];
   * const dc = new DataCalc(d);
   * console.log(
   *   dc.mutate({ doubledA: (obs) => obs.a * 2 }).observations
   * );
   * // [ { a: 1, b: 2, c: 3, doubledA: 2 },
   * //   { a: 0, b: 8, c: 3, doubledA: 0 },
   * //   { a: 9, b: 4, c: 7, doubledA: 18 } ]
   */
  mutate(mutations) {
    if (this._groups.length > 0) {
      throw new M2Error(
        `mutate() cannot be used on grouped data. The data are currently grouped by ${this._groups.join(
          ", "
        )}. Ungroup the data first using ungroup().`
      );
    }
    const newObservations = this._observations.map((observation) => {
      let newObservation = { ...observation };
      for (const [newVariable, transformFunction] of Object.entries(
        mutations
      )) {
        newObservation = {
          ...newObservation,
          [newVariable]: transformFunction(observation)
        };
      }
      return newObservation;
    });
    return new DataCalc(newObservations, { groups: this._groups });
  }
  /**
   * Calculates summaries of the data.
   *
   * @param summarizations - An object where the keys are the names of the new
   * variables and the values are `DataCalc` summary functions: `sum()`,
   * `mean()`, `median()`, `variance()`, `sd()`, `min()`, `max()`, or `n()`.
   * The summary functions take a variable name as a string, or alternatively,
   * a value or array of values to summarize.
   * @returns A new `DataCalc` object with the new summary variables.
   *
   * @example
   * ```js
   * const d = [
   *   { a: 1, b: 2, c: 3 },
   *   { a: 0, b: 8, c: 3 },
   *   { a: 9, b: 4, c: 7 },
   *   { a: 5, b: 0, c: 7 },
   * ];
   * const dc = new DataCalc(d);
   * console.log(
   *   dc.summarize({
   *     meanA: mean("a"),
   *     varA: variance("a"),
   *     totalB: sum("b")
   *   }).observations
   * );
   * // [ { meanA: 3.75, varA: 16.916666666666668, totalB: 14 } ]
   *
   * console.log(
   *   dc.summarize({
   *    filteredTotalC: sum(dc.filter(obs => obs.b > 2).pull("c"))
   *  }).observations
   * );
   * // [ { filteredTotalC: 10 } ]
   * ```
   */
  summarize(summarizations) {
    if (this._groups.length === 0) {
      const obs = {};
      for (const [newVariable, value] of Object.entries(summarizations)) {
        if (typeof value === "object" && value !== null && "summarizeFunction" in value) {
          const summarizeOperation = value;
          obs[newVariable] = summarizeOperation.summarizeFunction(
            this,
            summarizeOperation.parameters,
            summarizeOperation.options
          );
        } else {
          obs[newVariable] = value;
        }
      }
      return new DataCalc([obs], { groups: this._groups });
    }
    return this.summarizeByGroups(summarizations);
  }
  summarizeByGroups(summarizations) {
    const groupMap = /* @__PURE__ */ new Map();
    this._observations.forEach((obs) => {
      const groupKey = this._groups.map(
        (g) => typeof obs[g] === "object" ? JSON.stringify(obs[g]) : obs[g]
      ).join("|");
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      const groupArray = groupMap.get(groupKey);
      if (groupArray) {
        groupArray.push(obs);
      } else {
        groupMap.set(groupKey, [obs]);
      }
    });
    const summarizedObservations = [];
    groupMap.forEach((groupObs, groupKey) => {
      const groupValues = groupKey.split("|");
      const firstObs = groupObs[0];
      const summaryObj = {};
      this._groups.forEach((group, i) => {
        const valueStr = groupValues[i];
        const originalType = typeof firstObs[group];
        if (originalType === "number") {
          summaryObj[group] = Number(valueStr);
        } else if (originalType === "boolean") {
          summaryObj[group] = valueStr === "true";
        } else if (valueStr.startsWith("{") || valueStr.startsWith("[")) {
          try {
            summaryObj[group] = JSON.parse(valueStr);
          } catch {
            throw new M2Error(
              `Failed to parse group value ${valueStr} as JSON for group ${group}`
            );
          }
        } else {
          summaryObj[group] = valueStr;
        }
      });
      const groupDataCalc = new DataCalc(groupObs);
      for (const [newVariable, value] of Object.entries(summarizations)) {
        if (typeof value === "object" && value !== null && "summarizeFunction" in value) {
          const summarizeOperation = value;
          summaryObj[newVariable] = summarizeOperation.summarizeFunction(
            groupDataCalc,
            summarizeOperation.parameters,
            summarizeOperation.options
          );
        } else {
          summaryObj[newVariable] = value;
        }
      }
      summarizedObservations.push(summaryObj);
    });
    return new DataCalc(summarizedObservations, { groups: this._groups });
  }
  /**
   * Selects specific variables to keep in the dataset.
   * Variables prefixed with "-" will be excluded from the result.
   *
   * @param variables - Names of variables to select; prefix with '-' to exclude instead
   * @returns A new DataCalc object with only the selected variables (minus excluded ones)
   *
   * @example
   * ```js
   * const d = [
   *   { a: 1, b: 2, c: 3, d: 4 },
   *   { a: 5, b: 6, c: 7, d: 8 }
   * ];
   * const dc = new DataCalc(d);
   * // Keep a and c
   * console.log(dc.select("a", "c").observations);
   * // [ { a: 1, c: 3 }, { a: 5, c: 7 } ]
   * ```
   */
  select(...variables) {
    const includeVars = [];
    const excludeVars = [];
    variables.forEach((variable) => {
      if (variable.startsWith("-")) {
        excludeVars.push(variable.substring(1));
      } else {
        includeVars.push(variable);
      }
    });
    const allVars = includeVars.length > 0 ? includeVars : Object.keys(this._observations[0] || {});
    [...allVars, ...excludeVars].forEach((variable) => {
      this.verifyObservationsContainVariable(variable);
    });
    const excludeSet = new Set(excludeVars);
    const newObservations = this._observations.map((observation) => {
      const newObservation = {};
      if (includeVars.length > 0) {
        includeVars.forEach((variable) => {
          if (!excludeSet.has(variable)) {
            newObservation[variable] = observation[variable];
          }
        });
      } else {
        Object.keys(observation).forEach((key) => {
          if (!excludeSet.has(key)) {
            newObservation[key] = observation[key];
          }
        });
      }
      return newObservation;
    });
    return new DataCalc(newObservations, { groups: this._groups });
  }
  /**
   * Arranges (sorts) the observations based on one or more variables.
   *
   * @param variables - Names of variables to sort by, prefixed with '-' for descending order
   * @returns A new DataCalc object with the observations sorted
   *
   * @example
   * ```js
   * const d = [
   *   { a: 5, b: 2 },
   *   { a: 3, b: 7 },
   *   { a: 5, b: 1 }
   * ];
   * const dc = new DataCalc(d);
   * // Sort by a (ascending), then by b (descending)
   * console.log(dc.arrange("a", "-b").observations);
   * // [ { a: 3, b: 7 }, { a: 5, b: 2 }, { a: 5, b: 1 } ]
   * ```
   */
  arrange(...variables) {
    if (this._groups.length > 0) {
      throw new M2Error(
        `arrange() cannot be used on grouped data. The data are currently grouped by ${this._groups.join(
          ", "
        )}. Ungroup the data first using ungroup().`
      );
    }
    const sortedObservations = [...this._observations].sort((a, b) => {
      for (const variable of variables) {
        let varName = variable;
        let direction = 1;
        if (variable.startsWith("-")) {
          varName = variable.substring(1);
          direction = -1;
        }
        if (!(varName in a) || !(varName in b)) {
          throw new M2Error(
            `arrange(): variable ${varName} does not exist in all observations`
          );
        }
        const aVal = a[varName];
        const bVal = b[varName];
        if (typeof aVal !== typeof bVal) {
          return direction * (String(aVal) < String(bVal) ? -1 : 1);
        }
        if (aVal < bVal) return -1 * direction;
        if (aVal > bVal) return 1 * direction;
      }
      return 0;
    });
    return new DataCalc(sortedObservations, { groups: this._groups });
  }
  /**
   * Keeps only unique/distinct observations.
   *
   * @returns A new `DataCalc` object with only unique observations
   *
   * @example
   * ```js
   * const d = [
   *   { a: 1, b: 2, c: 3 },
   *   { a: 1, b: 2, c: 3 }, // Duplicate
   *   { a: 2, b: 3, c: 5 },
   *   { a: 1, b: 2, c: { name: "dog" } },
   *   { a: 1, b: 2, c: { name: "dog" } } // Duplicate with nested object
   * ];
   * const dc = new DataCalc(d);
   * console.log(dc.distinct().observations);
   * // [ { a: 1, b: 2, c: 3 }, { a: 2, b: 3, c: 5 }, { a: 1, b: 2, c: { name: "dog" } } ]
   * ```
   */
  distinct() {
    const seen = /* @__PURE__ */ new Set();
    const uniqueObs = this._observations.filter((obs) => {
      const key = JSON.stringify(this.normalizeForComparison(obs));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return new DataCalc(uniqueObs, { groups: this._groups });
  }
  /**
   * Renames variables in the observations.
   *
   * @param renames - Object mapping new variable names to old variable names
   * @returns A new DataCalc object with renamed variables
   *
   * @example
   * ```js
   * const d = [
   *   { a: 1, b: 2, c: 3 },
   *   { a: 4, b: 5, c: 6 }
   * ];
   * const dc = new DataCalc(d);
   * console.log(dc.rename({ x: 'a', z: 'c' }).observations);
   * // [ { x: 1, b: 2, z: 3 }, { x: 4, b: 5, z: 6 } ]
   * ```
   */
  rename(renames) {
    if (this._observations.length === 0) {
      throw new M2Error("Cannot rename variables on an empty dataset");
    }
    Object.values(renames).forEach((oldName) => {
      this.verifyObservationsContainVariable(oldName);
    });
    const newObservations = this._observations.map((observation) => {
      const newObservation = {};
      for (const [key, value] of Object.entries(observation)) {
        const newKey = Object.entries(renames).find(
          ([, old]) => old === key
        )?.[0];
        if (newKey) {
          newObservation[newKey] = value;
        } else if (!Object.values(renames).includes(key)) {
          newObservation[key] = value;
        }
      }
      return newObservation;
    });
    return new DataCalc(newObservations, { groups: this._groups });
  }
  /**
   * Performs an inner join with another DataCalc object.
   * Only rows with matching keys in both datasets are included.
   *
   * @param other - The other DataCalc object to join with
   * @param by - The variables to join on
   * @returns A new DataCalc object with joined observations
   *
   * @example
   * ```js
   * const d1 = [
   *   { id: 1, x: 'a' },
   *   { id: 2, x: 'b' },
   *   { id: 3, x: 'c' }
   * ];
   * const d2 = [
   *   { id: 1, y: 100 },
   *   { id: 2, y: 200 },
   *   { id: 4, y: 400 }
   * ];
   * const dc1 = new DataCalc(d1);
   * const dc2 = new DataCalc(d2);
   * console.log(dc1.innerJoin(dc2, ["id"]).observations);
   * // [ { id: 1, x: 'a', y: 100 }, { id: 2, x: 'b', y: 200 } ]
   * ```
   */
  innerJoin(other, by) {
    if (this._groups.length > 0 || other._groups.length > 0) {
      throw new M2Error(
        `innerJoin() cannot be used on grouped data. Ungroup the data first using ungroup().`
      );
    }
    by.forEach((key) => {
      this.verifyObservationsContainVariable(key);
      other.verifyObservationsContainVariable(key);
    });
    const rightMap = /* @__PURE__ */ new Map();
    other.observations.forEach((obs) => {
      if (this.hasNullJoinKeys(obs, by)) {
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(obs[k]))).join("|");
      const matches = rightMap.get(key) || [];
      matches.push(obs);
      rightMap.set(key, matches);
    });
    const result = [];
    this._observations.forEach((leftObs) => {
      if (this.hasNullJoinKeys(leftObs, by)) {
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(leftObs[k]))).join("|");
      const rightMatches = rightMap.get(key) || [];
      if (rightMatches.length > 0) {
        rightMatches.forEach((rightObs) => {
          const joinedObs = { ...leftObs };
          Object.entries(rightObs).forEach(([k, v]) => {
            if (!by.includes(k)) {
              joinedObs[k] = v;
            }
          });
          result.push(joinedObs);
        });
      }
    });
    return new DataCalc(result);
  }
  /**
   * Performs a left join with another DataCalc object.
   * All rows from the left dataset are included, along with matching rows from the right.
   *
   * @param other - The other DataCalc object to join with
   * @param by - The variables to join on
   * @returns A new DataCalc object with joined observations
   *
   * @example
   * ```js
   * const d1 = [
   *   { id: 1, x: 'a' },
   *   { id: 2, x: 'b' },
   *   { id: 3, x: 'c' }
   * ];
   * const d2 = [
   *   { id: 1, y: 100 },
   *   { id: 2, y: 200 }
   * ];
   * const dc1 = new DataCalc(d1);
   * const dc2 = new DataCalc(d2);
   * console.log(dc1.leftJoin(dc2, ["id"]).observations);
   * // [ { id: 1, x: 'a', y: 100 }, { id: 2, x: 'b', y: 200 }, { id: 3, x: 'c' } ]
   * ```
   */
  leftJoin(other, by) {
    if (this._groups.length > 0 || other._groups.length > 0) {
      throw new M2Error(
        `leftJoin() cannot be used on grouped data. Ungroup the data first using ungroup().`
      );
    }
    by.forEach((key) => {
      this.verifyObservationsContainVariable(key);
      other.verifyObservationsContainVariable(key);
    });
    const rightMap = /* @__PURE__ */ new Map();
    other.observations.forEach((obs) => {
      if (this.hasNullJoinKeys(obs, by)) {
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(obs[k]))).join("|");
      const matches = rightMap.get(key) || [];
      matches.push(obs);
      rightMap.set(key, matches);
    });
    const result = [];
    this._observations.forEach((leftObs) => {
      if (this.hasNullJoinKeys(leftObs, by)) {
        result.push({ ...leftObs });
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(leftObs[k]))).join("|");
      const rightMatches = rightMap.get(key) || [];
      if (rightMatches.length > 0) {
        rightMatches.forEach((rightObs) => {
          const joinedObs = { ...leftObs };
          Object.entries(rightObs).forEach(([k, v]) => {
            if (!by.includes(k)) {
              joinedObs[k] = v;
            }
          });
          result.push(joinedObs);
        });
      } else {
        result.push({ ...leftObs });
      }
    });
    return new DataCalc(result);
  }
  /**
   * Performs a right join with another DataCalc object.
   * All rows from the right dataset are included, along with matching rows from the left.
   *
   * @param other - The other DataCalc object to join with
   * @param by - The variables to join on
   * @returns A new DataCalc object with joined observations
   *
   * @example
   * ```js
   * const d1 = [
   *   { id: 1, x: 'a' },
   *   { id: 2, x: 'b' }
   * ];
   * const d2 = [
   *   { id: 1, y: 100 },
   *   { id: 2, y: 200 },
   *   { id: 4, y: 400 }
   * ];
   * const dc1 = new DataCalc(d1);
   * const dc2 = new DataCalc(d2);
   * console.log(dc1.rightJoin(dc2, ["id"]).observations);
   * // [ { id: 1, x: 'a', y: 100 }, { id: 2, x: 'b', y: 200 }, { id: 4, y: 400 } ]
   * ```
   */
  rightJoin(other, by) {
    if (this._groups.length > 0 || other._groups.length > 0) {
      throw new M2Error(
        `rightJoin() cannot be used on grouped data. Ungroup the data first using ungroup().`
      );
    }
    by.forEach((key) => {
      this.verifyObservationsContainVariable(key);
      other.verifyObservationsContainVariable(key);
    });
    const rightMap = /* @__PURE__ */ new Map();
    other.observations.forEach((obs) => {
      if (this.hasNullJoinKeys(obs, by)) {
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(obs[k]))).join("|");
      const matches = rightMap.get(key) || [];
      matches.push(obs);
      rightMap.set(key, matches);
    });
    const result = [];
    const processedRightKeys = /* @__PURE__ */ new Set();
    this._observations.forEach((leftObs) => {
      if (this.hasNullJoinKeys(leftObs, by)) {
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(leftObs[k]))).join("|");
      const rightMatches = rightMap.get(key) || [];
      if (rightMatches.length > 0) {
        rightMatches.forEach((rightObs) => {
          const joinedObs = { ...leftObs };
          Object.entries(rightObs).forEach(([k, v]) => {
            if (!by.includes(k)) {
              joinedObs[k] = v;
            }
          });
          result.push(joinedObs);
        });
        processedRightKeys.add(key);
      }
    });
    other.observations.forEach((rightObs) => {
      if (this.hasNullJoinKeys(rightObs, by)) {
        result.push({ ...rightObs });
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(rightObs[k]))).join("|");
      if (!processedRightKeys.has(key)) {
        result.push({ ...rightObs });
        processedRightKeys.add(key);
      }
    });
    return new DataCalc(result);
  }
  /**
   * Performs a full join with another DataCalc object.
   * All rows from both datasets are included.
   *
   * @param other - The other DataCalc object to join with
   * @param by - The variables to join on
   * @returns A new DataCalc object with joined observations
   *
   * @example
   * ```js
   * const d1 = [
   *   { id: 1, x: 'a' },
   *   { id: 2, x: 'b' },
   *   { id: 3, x: 'c' }
   * ];
   * const d2 = [
   *   { id: 1, y: 100 },
   *   { id: 2, y: 200 },
   *   { id: 4, y: 400 }
   * ];
   * const dc1 = new DataCalc(d1);
   * const dc2 = new DataCalc(d2);
   * console.log(dc1.fullJoin(dc2, ["id"]).observations);
   * // [
   * //   { id: 1, x: 'a', y: 100 },
   * //   { id: 2, x: 'b', y: 200 },
   * //   { id: 3, x: 'c' },
   * //   { id: 4, y: 400 }
   * // ]
   * ```
   */
  fullJoin(other, by) {
    if (this._groups.length > 0 || other._groups.length > 0) {
      throw new M2Error(
        `fullJoin() cannot be used on grouped data. Ungroup the data first using ungroup().`
      );
    }
    by.forEach((key) => {
      this.verifyObservationsContainVariable(key);
      other.verifyObservationsContainVariable(key);
    });
    const rightMap = /* @__PURE__ */ new Map();
    other.observations.forEach((obs) => {
      if (this.hasNullJoinKeys(obs, by)) {
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(obs[k]))).join("|");
      const matches = rightMap.get(key) || [];
      matches.push(obs);
      rightMap.set(key, matches);
    });
    const result = [];
    const processedRightKeys = /* @__PURE__ */ new Set();
    this._observations.forEach((leftObs) => {
      if (this.hasNullJoinKeys(leftObs, by)) {
        result.push({ ...leftObs });
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(leftObs[k]))).join("|");
      const rightMatches = rightMap.get(key) || [];
      if (rightMatches.length > 0) {
        rightMatches.forEach((rightObs) => {
          const joinedObs = { ...leftObs };
          Object.entries(rightObs).forEach(([k, v]) => {
            if (!by.includes(k)) {
              joinedObs[k] = v;
            }
          });
          result.push(joinedObs);
        });
        processedRightKeys.add(key);
      } else {
        result.push({ ...leftObs });
      }
    });
    other.observations.forEach((rightObs) => {
      if (this.hasNullJoinKeys(rightObs, by)) {
        result.push({ ...rightObs });
        return;
      }
      const key = by.map((k) => JSON.stringify(this.normalizeForComparison(rightObs[k]))).join("|");
      if (!processedRightKeys.has(key)) {
        result.push({ ...rightObs });
        processedRightKeys.add(key);
      }
    });
    return new DataCalc(result);
  }
  /**
   * Slice observations by position.
   *
   * @param start - Starting position (0-based). Negative values count from
   * the end.
   * @param end - Ending position (exclusive)
   * @returns A new DataCalc object with sliced observations
   *
   * @remarks If `end` is not provided, it will return a single observation at
   * `start` position. If `start` is beyond the length of observations,
   * it will return an empty DataCalc.
   *
   * @example
   * ```js
   * const d = [
   *   { a: 1, b: 2 },
   *   { a: 3, b: 4 },
   *   { a: 5, b: 6 },
   *   { a: 7, b: 8 }
   * ];
   * const dc = new DataCalc(d);
   * console.log(dc.slice(1, 3).observations);
   * // [ { a: 3, b: 4 }, { a: 5, b: 6 } ]
   * console.log(dc.slice(0).observations);
   * // [ { a: 1, b: 2 } ]
   * ```
   */
  slice(start, end) {
    if (this._groups.length > 0) {
      throw new M2Error(
        `slice() cannot be used on grouped data. Ungroup the data first using ungroup().`
      );
    }
    let sliced;
    if (start >= this._observations.length) {
      return new DataCalc([], { groups: this._groups });
    }
    if (end === void 0) {
      const index = start < 0 ? this._observations.length + start : start;
      sliced = [this._observations[index]];
    } else {
      sliced = this._observations.slice(start, end);
    }
    return new DataCalc(sliced, { groups: this._groups });
  }
  /**
   * Combines observations from two DataCalc objects by rows.
   *
   * @param other - The other DataCalc object to bind with
   * @returns A new DataCalc object with combined observations
   *
   * @example
   * ```js
   * const d1 = [
   *   { a: 1, b: 2 },
   *   { a: 3, b: 4 }
   * ];
   * const d2 = [
   *   { a: 5, b: 6 },
   *   { a: 7, b: 8 }
   * ];
   * const dc1 = new DataCalc(d1);
   * const dc2 = new DataCalc(d2);
   * console.log(dc1.bindRows(dc2).observations);
   * // [ { a: 1, b: 2 }, { a: 3, b: 4 }, { a: 5, b: 6 }, { a: 7, b: 8 } ]
   * ```
   */
  bindRows(other) {
    if (this._observations.length > 0 && other.observations.length > 0) {
      const thisVariables = new Set(Object.keys(this._observations[0]));
      const otherVariables = new Set(Object.keys(other.observations[0]));
      const commonVariables = [...thisVariables].filter(
        (variable) => otherVariables.has(variable)
      );
      commonVariables.forEach((variable) => {
        const thisType = this.getVariableType(variable);
        const otherType = other.getVariableType(variable);
        if (thisType !== otherType) {
          console.warn(
            `Warning: bindRows() is combining datasets with different data types for variable '${variable}'. Left dataset has type '${thisType}' and right dataset has type '${otherType}'.`
          );
        }
      });
    }
    return new DataCalc([...this._observations, ...other.observations]);
  }
  /**
   * Helper method to determine the primary type of a variable across observations
   * @internal
   *
   * @param variable - The variable name to check
   * @returns The most common type for the variable or 'mixed' if no clear type exists
   */
  getVariableType(variable) {
    if (this._observations.length === 0) {
      return "unknown";
    }
    const typeCounts = {};
    this._observations.forEach((obs) => {
      if (variable in obs) {
        const value = obs[variable];
        const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      }
    });
    let maxCount = 0;
    let dominantType = "unknown";
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = type;
      }
    }
    return dominantType;
  }
  /**
   * Verifies that the variable exists in each observation in the data.
   *
   * @remarks Throws an error if the variable does not exist in each
   * observation. This is not meant to be called by users of the library, but
   * is used internally.
   * @internal
   *
   * @param variable - The variable to check for
   */
  verifyObservationsContainVariable(variable) {
    if (!this._observations.every((observation) => variable in observation)) {
      throw new M2Error(
        `Variable ${variable} does not exist for each item (row) in the data array.`
      );
    }
  }
  /**
   * Checks if the variable exists for at least one observation in the data.
   *
   * @remarks This is not meant to be called by users of the library, but
   * is used internally.
   * @internal
   *
   * @param variable - The variable to check for
   * @returns true if the variable exists in at least one observation, false
   * otherwise
   */
  variableExists(variable) {
    return this._observations.some((observation) => variable in observation);
  }
  /**
   * Checks if a value is a non-missing numeric value.
   *
   * @remarks A non-missing numeric value is a value that is a number and is
   * not NaN or infinite.
   *
   * @param value - The value to check
   * @returns true if the value is a non-missing numeric value, false otherwise
   */
  isNonMissingNumeric(value) {
    return typeof value === "number" && !isNaN(value) && isFinite(value);
  }
  /**
   * Checks if a value is a missing numeric value.
   *
   * @remarks A missing numeric value is a number that is NaN or infinite, or any
   * value that is null or undefined. Thus, a null or undefined value is
   * considered to be a missing numeric value.
   *
   * @param value - The value to check
   * @returns true if the value is a missing numeric value, false otherwise
   */
  isMissingNumeric(value) {
    return typeof value === "number" && (isNaN(value) || !isFinite(value)) || value === null || typeof value === "undefined";
  }
  /**
   * Normalizes an object for stable comparison by sorting keys
   * @internal
   *
   * @remarks Normalizing is needed to handle situations where objects have the
   * same properties but in different orders because we are using
   * JSON.stringify() for comparison.
   */
  normalizeForComparison(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.normalizeForComparison(item));
    }
    return Object.keys(obj).sort().reduce((result, key) => {
      result[key] = this.normalizeForComparison(obj[key]);
      return result;
    }, {});
  }
  /**
   * Creates a deep copy of an object.
   * @internal
   *
   * @remarks We create a deep copy of the object, in our case an instance
   * of `DataCalc`, to ensure that we are working with a new object
   * without any references to the original object. This is important
   * to avoid unintended side effects when modifying an object.
   *
   * @param source - object to copy
   * @param map - map of objects that have already been copied
   * @returns a deep copy of the object
   */
  deepCopy(source, map = /* @__PURE__ */ new WeakMap()) {
    if (source === null || typeof source !== "object") {
      return source;
    }
    if (map.has(source)) {
      return map.get(source);
    }
    const copy = Array.isArray(source) ? [] : Object.create(Object.getPrototypeOf(source));
    map.set(source, copy);
    const keys = [
      ...Object.getOwnPropertyNames(source),
      ...Object.getOwnPropertySymbols(source)
    ];
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(
        source,
        key
      );
      if (descriptor) {
        Object.defineProperty(copy, key, {
          ...descriptor,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value: this.deepCopy(source[key], map)
        });
      }
    }
    return copy;
  }
  /**
   * Checks if an observation has null or undefined values in any of the join columns.
   * @internal
   *
   * @param obs - The observation to check
   * @param keys - The join columns to check
   * @returns true if any join column has a null or undefined value
   */
  hasNullJoinKeys(obs, keys) {
    return keys.some((key) => obs[key] === null || obs[key] === void 0);
  }
}
const DEFAULT_SUMMARIZE_OPTIONS = {
  coerceBooleans: true,
  skipMissing: false
};
function applyDefaultOptions(options) {
  return { ...DEFAULT_SUMMARIZE_OPTIONS, ...options };
}
function processNumericValues(dataCalc, variable, options, collector, errorPrefix, initialState) {
  const mergedOptions = applyDefaultOptions(options);
  dataCalc.verifyObservationsContainVariable(variable);
  let count = 0;
  let state = initialState;
  let containsMissing = false;
  dataCalc.observations.forEach((o) => {
    if (dataCalc.isNonMissingNumeric(o[variable])) {
      state = collector(o[variable], state);
      count++;
      return;
    }
    if (typeof o[variable] === "boolean" && mergedOptions.coerceBooleans) {
      state = collector(o[variable] ? 1 : 0, state);
      count++;
      return;
    }
    if (dataCalc.isMissingNumeric(o[variable])) {
      containsMissing = true;
      return;
    }
    throw new M2Error(
      `${errorPrefix}: variable ${variable} has non-numeric value ${o[variable]} in this observation: ${JSON.stringify(o)}`
    );
  });
  return { state, count, containsMissing };
}
function processDirectValues(values, options, collector, errorPrefix, initialState) {
  const mergedOptions = applyDefaultOptions(options);
  let state = initialState;
  let count = 0;
  let containsMissing = false;
  for (const value of values) {
    if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
      state = collector(value, state);
      count++;
    } else if (typeof value === "boolean" && mergedOptions.coerceBooleans) {
      state = collector(value ? 1 : 0, state);
      count++;
    } else if (value === null || value === void 0 || typeof value === "number" && (isNaN(value) || !isFinite(value))) {
      containsMissing = true;
    } else {
      throw new M2Error(`${errorPrefix}: has non-numeric value ${value}`);
    }
  }
  return { state, count, containsMissing };
}
function processSingleValue(value, options, errorPrefix) {
  const mergedOptions = applyDefaultOptions(options);
  if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
    return { value, isMissing: false };
  } else if (typeof value === "boolean" && mergedOptions.coerceBooleans) {
    return { value: value ? 1 : 0, isMissing: false };
  } else if (value === null || value === void 0 || typeof value === "number" && (isNaN(value) || !isFinite(value))) {
    return { value: 0, isMissing: true };
  } else {
    throw new M2Error(`${errorPrefix}: has non-numeric value ${value}`);
  }
}
const sumInternal = (dataCalc, params, options) => {
  const variableOrValues = params[0];
  const mergedOptions = applyDefaultOptions(options);
  if (typeof variableOrValues === "string") {
    if (!dataCalc.variableExists(variableOrValues)) {
      return null;
    }
    const variable = variableOrValues;
    const result = processNumericValues(
      dataCalc,
      variable,
      options,
      (value, sum2) => sum2 + value,
      "sum()",
      0
    );
    if (result.containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (result.count === 0) {
      return null;
    }
    return result.state;
  } else if (Array.isArray(variableOrValues)) {
    const result = processDirectValues(
      variableOrValues,
      options,
      (value, sum2) => sum2 + value,
      "sum()",
      0
    );
    if (result.containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (result.count === 0) {
      return null;
    }
    return result.state;
  } else {
    const result = processSingleValue(variableOrValues, options, "sum()");
    if (result.isMissing && !mergedOptions.skipMissing) {
      return null;
    }
    return result.isMissing ? null : result.value;
  }
};
function sum(variableOrValues, options) {
  return {
    summarizeFunction: sumInternal,
    parameters: [variableOrValues],
    options
  };
}
const medianInternal = (dataCalc, params, options) => {
  const variableOrValues = params[0];
  const mergedOptions = applyDefaultOptions(options);
  if (typeof variableOrValues === "string") {
    if (!dataCalc.variableExists(variableOrValues)) {
      return null;
    }
    const variable = variableOrValues;
    dataCalc.verifyObservationsContainVariable(variable);
    const values = [];
    let containsMissing = false;
    dataCalc.observations.forEach((o) => {
      if (dataCalc.isNonMissingNumeric(o[variable])) {
        values.push(o[variable]);
      } else if (typeof o[variable] === "boolean" && mergedOptions.coerceBooleans) {
        values.push(o[variable] ? 1 : 0);
      } else if (dataCalc.isMissingNumeric(o[variable])) {
        containsMissing = true;
      } else {
        throw new M2Error(
          `median(): variable ${variable} has non-numeric value ${o[variable]} in this observation: ${JSON.stringify(o)}`
        );
      }
    });
    if (containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (values.length === 0) {
      return null;
    }
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    if (values.length % 2 === 0) {
      return (values[mid - 1] + values[mid]) / 2;
    } else {
      return values[mid];
    }
  } else if (Array.isArray(variableOrValues)) {
    const values = [];
    let containsMissing = false;
    for (const value of variableOrValues) {
      if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
        values.push(value);
      } else if (typeof value === "boolean" && mergedOptions.coerceBooleans) {
        values.push(value ? 1 : 0);
      } else if (value === null || value === void 0 || typeof value === "number" && (isNaN(value) || !isFinite(value))) {
        containsMissing = true;
      } else {
        throw new M2Error(`median(): has non-numeric value ${value}`);
      }
    }
    if (containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (values.length === 0) {
      return null;
    }
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    if (values.length % 2 === 0) {
      return (values[mid - 1] + values[mid]) / 2;
    } else {
      return values[mid];
    }
  } else {
    const result = processSingleValue(variableOrValues, options, "median()");
    if (result.isMissing && !mergedOptions.skipMissing) {
      return null;
    }
    return result.isMissing ? null : result.value;
  }
};
function median(variableOrValues, options) {
  return {
    summarizeFunction: medianInternal,
    parameters: [variableOrValues],
    options
  };
}
console.log("\u26AA @m2c2kit/data-calc version 0.8.4 (92cfffbe)");

class GridMemory extends Game {
  constructor() {
    const defaultParameters = {
      number_of_dots: {
        type: "integer",
        default: 3,
        description: "Number of dots to present."
      },
      preparation_duration_ms: {
        type: "number",
        default: 500,
        description: "How long the 'get ready' message before each trial is shown, milliseconds."
      },
      blank_grid_duration_ms: {
        type: "number",
        default: 500,
        description: "How long a blank grid is shown before the dots appear, milliseconds."
      },
      interference_duration_ms: {
        type: "number",
        default: 8e3,
        description: "How long the grid of interference targets is shown, milliseconds."
      },
      interference_transition_animation: {
        type: "boolean",
        default: true,
        description: "Should the transitions between dot presentation, interference, and recall be animated slide transitions?"
      },
      dot_present_duration_ms: {
        type: "number",
        default: 3e3,
        description: "How long the dots are shown, milliseconds."
      },
      number_of_interference_targets: {
        type: "integer",
        default: 5,
        description: "How many targets to show in the interference phase."
      },
      number_of_trials: {
        type: "integer",
        default: 4,
        description: "How many trials to run."
      },
      show_trials_complete_scene: {
        default: true,
        type: "boolean",
        description: "After the final trial, should a completion scene be shown? Otherwise, the game will immediately end."
      },
      instruction_type: {
        type: "string",
        default: "long",
        description: "Type of instructions to show, 'short' or 'long'."
      },
      instructions: {
        default: null,
        type: ["object", "null"],
        description: "When non-null, an InstructionsOptions object that will completely override the built-in instructions."
      },
      show_quit_button: {
        type: "boolean",
        default: false,
        description: "Should the activity quit button be shown?"
      },
      show_fps: {
        type: "boolean",
        default: false,
        description: "Should the FPS be shown?"
      },
      show_locale_picker: {
        type: "boolean",
        default: false,
        description: "Should the icon that allows the participant to switch the locale be shown?"
      },
      scoring: {
        type: "boolean",
        default: false,
        description: "Should scoring data be generated? Default is false."
      },
      seed: {
        type: ["string", "null"],
        default: null,
        description: "Optional seed for the seeded pseudo-random number generator. When null, the default Math.random() is used."
      }
    };
    const gridMemoryTrialSchema = {
      activity_begin_iso8601_timestamp: {
        type: "string",
        format: "date-time",
        description: "ISO 8601 timestamp at the beginning of the game activity."
      },
      trial_begin_iso8601_timestamp: {
        type: ["string", "null"],
        format: "date-time",
        description: "ISO 8601 timestamp at the beginning of the trial. Null if trial was skipped."
      },
      trial_end_iso8601_timestamp: {
        type: ["string", "null"],
        format: "date-time",
        description: "ISO 8601 timestamp at the end of the trial (when user presses 'Done' after placing the three objects). Null if trial was skipped."
      },
      trial_index: {
        type: ["integer", "null"],
        description: "Index of the trial within this assessment, 0-based."
      },
      response_time_duration_ms: {
        type: ["number", "null"],
        description: "Milliseconds from the when the empty grid is shown in the recall phase until the user has placed all dots and taps the done button. Null if trial was skipped."
      },
      presented_cells: {
        type: ["array", "null"],
        description: "Randomly chosen locations of the dots presented to the user. Null if trial was skipped.",
        items: {
          type: "object",
          properties: {
            row: {
              type: "integer",
              description: "Row of the cell, 0-indexed."
            },
            column: {
              type: "integer",
              description: "Column of the cell, 0-indexed."
            }
          }
        }
      },
      selected_cells: {
        type: ["array", "null"],
        description: "User selected locations of the dots. Null if trial was skipped.",
        items: {
          type: "object",
          properties: {
            row: {
              type: "integer",
              description: "Row of the cell, 0-indexed."
            },
            column: {
              type: "integer",
              description: "Column of the cell, 0-indexed."
            }
          }
        }
      },
      user_dot_actions: {
        type: ["array", "null"],
        description: "Complete user dot actions: placement, removal, and done. Null if trial was skipped.",
        items: {
          type: "object",
          properties: {
            elapsed_duration_ms: {
              type: "number",
              description: "Duration, milliseconds, from when dot recall scene fully appeared until this user action."
            },
            action_type: {
              type: "string",
              enum: ["placed", "removed", "done"],
              description: "Was the action a dot placement, dot removal, or done button push?"
            },
            cell: {
              type: ["object", "null"],
              description: "Cell of user action; null if non-applicable (user action was done button push).",
              properties: {
                row: {
                  type: "integer",
                  description: "Row of the cell, 0-indexed."
                },
                column: {
                  type: "integer",
                  description: "Column of the cell, 0-indexed."
                },
                tap_x: {
                  type: "number",
                  description: "X coordinate of user's tap on the cell, relative to the cell."
                },
                tap_y: {
                  type: "number",
                  description: "Y coordinate of user's tap on the cell, relative to the cell."
                }
              }
            }
          }
        }
      },
      user_interference_actions: {
        type: ["array", "null"],
        description: "User actions tapping the interference targets. Null if trial was skipped.",
        items: {
          type: "object",
          properties: {
            elapsed_duration_ms: {
              type: "number",
              description: "Duration, milliseconds, from when interference scene fully appeared until this user action."
            },
            action_type: {
              type: "string",
              enum: ["on-target", "off-target"],
              description: "Was the action on an interference target or off?"
            },
            cell: {
              type: "object",
              description: "Cell of user interference action.",
              properties: {
                row: {
                  type: "integer",
                  description: "Row of the cell, 0-indexed."
                },
                column: {
                  type: "integer",
                  description: "Column of the cell, 0-indexed."
                },
                tap_x: {
                  type: "number",
                  description: "X coordinate of user's tap on the cell, relative to the cell."
                },
                tap_y: {
                  type: "number",
                  description: "Y coordinate of user's tap on the cell, relative to the cell."
                }
              }
            }
          }
        }
      },
      number_of_correct_dots: {
        type: ["integer", "null"],
        description: "Number of dots that were correctly placed. Null if trial was skipped."
      },
      quit_button_pressed: {
        type: "boolean",
        description: "Was the quit button pressed?"
      }
    };
    const gridMemoryScoringSchema = {
      activity_begin_iso8601_timestamp: {
        type: "string",
        format: "date-time",
        description: "ISO 8601 timestamp at the beginning of the game activity."
      },
      first_trial_begin_iso8601_timestamp: {
        type: ["string", "null"],
        format: "date-time",
        description: "ISO 8601 timestamp at the beginning of the first trial. Null if no trials were completed."
      },
      last_trial_end_iso8601_timestamp: {
        type: ["string", "null"],
        format: "date-time",
        description: "ISO 8601 timestamp at the end of the last trial. Null if no trials were completed."
      },
      n_trials: {
        type: "integer",
        description: "Number of trials completed."
      },
      n_trials_exact_targets: {
        type: "integer",
        description: "Number of trials in which the user selected the exact target cells without error."
      },
      flag_trials_match_expected: {
        type: "integer",
        description: "Does the number of completed and expected trials match? 1 = true, 0 = false."
      },
      distance_hausdorff_median: {
        type: ["number", "null"],
        description: "Median across all trials of the Hausdorff distance between the presented and selected cells within a trial."
      },
      sum_exact_targets: {
        type: ["integer", "null"],
        description: "Sum of the number of exact targets across all trials. An exact target is a target that was selected in the correct location."
      },
      percent_exact_targets: {
        type: "number",
        description: "Percent of exact targets out of all targets across all trials. An exact target is a target that was selected in the correct location."
      }
    };
    const translation = {
      configuration: {
        baseLocale: "en-US"
      },
      "en-US": {
        localeName: "English",
        INSTRUCTIONS_TITLE: "Grid Memory",
        INSTRUCTIONS_TEXT_PAGE_1: "For this activity, try to remember the location of {{NUMBER_OF_DOTS}} dots.",
        INSTRUCTIONS_TEXT_PAGE_2: "Before placing the {{NUMBER_OF_DOTS}} dots in their location, you will also have to tap some Fs on the screen as quickly as you can.",
        INSTRUCTIONS_TEXT_PAGE_3: "Press START to begin!",
        GET_READY: "GET READY",
        REMEMBER_LOCATIONS: "Remember the dot locations!",
        TOUCH_INTERFERENCE: "Touch the F's!",
        DONE_BUTTON_TEXT: "Done",
        WHERE_WERE: "Where were the dots?",
        MUST_SELECT: "You must select all {{NUMBER_OF_DOTS}} locations!",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Next",
        BACK_BUTTON_TEXT: "Back",
        TRIALS_COMPLETE_SCENE_TEXT: "This activity is complete.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      // cSpell:disable (for VS Code extension, Code Spell Checker)
      "es-MX": {
        localeName: "Espa\xF1ol",
        INSTRUCTIONS_TITLE: "Memoria de Puntos",
        INSTRUCTIONS_TEXT_PAGE_1: "Para esta actividad, intenta recordar la ubicaci\xF3n de {{NUMBER_OF_DOTS}} puntos.",
        INSTRUCTIONS_TEXT_PAGE_2: "Antes de colocar los {{NUMBER_OF_DOTS}} puntos en su ubicaci\xF3n, tambi\xE9n tendr\xE1s que tocar las Fs en la pantalla lo m\xE1s r\xE1pido que puedas.",
        INSTRUCTIONS_TEXT_PAGE_3: "Presione COMENZAR para Empezar",
        GET_READY: "PREP\xC1RESE",
        REMEMBER_LOCATIONS: "Recuerda las ubicaciones de los puntos",
        TOUCH_INTERFERENCE: "\xA1Toca las Fs!",
        DONE_BUTTON_TEXT: "Listo",
        WHERE_WERE: "\xBFD\xF3nde estaban los puntos?",
        MUST_SELECT: "\xA1Debes seleccionar todas las {{NUMBER_OF_DOTS}} ubicaciones!",
        START_BUTTON_TEXT: "COMENZAR",
        NEXT_BUTTON_TEXT: "Siguiente",
        BACK_BUTTON_TEXT: "Atr\xE1s",
        TRIALS_COMPLETE_SCENE_TEXT: "Esta actividad est\xE1 completa.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      "de-DE": {
        localeName: "Deutsch",
        INSTRUCTIONS_TITLE: "Raster-Ged\xE4chtnis",
        INSTRUCTIONS_TEXT_PAGE_1: "In dieser Aufgabe werden {{NUMBER_OF_DOTS}} rote Punkte kurz in einem Raster erscheinen. Ihre Aufgabe ist es, sich ihre Standorte zu merken!",
        INSTRUCTIONS_TEXT_PAGE_2: "Als n\xE4chstes werden Sie eine Seite voll mit den Buchstaben E und F sehen, wie auf dem Beispiel unten. Ihre Aufgabe ist es, so schnell wie m\xF6glich auf alle F's zu tippen!",
        INSTRUCTIONS_TEXT_PAGE_3: "Sobald das leere Raster erscheint, platzieren Sie die Punkte dort, wo Sie sie zuvor gesehen haben, indem Sie auf die entsprechenden Stellen tippen.",
        GET_READY: "BEREIT MACHEN",
        REMEMBER_LOCATIONS: "Merken Sie sich die Punktpositionen!",
        TOUCH_INTERFERENCE: "Ber\xFChren die F's!",
        DONE_BUTTON_TEXT: "Fertig",
        WHERE_WERE: "Wo waren die Punkte?",
        MUST_SELECT: "Sie m\xFCssen alle {{NUMBER_OF_DOTS}} Punktpositionen ausw\xE4hlen!",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Weiter",
        BACK_BUTTON_TEXT: "Vorherige",
        TRIALS_COMPLETE_SCENE_TEXT: "Die Aufgabe ist beendet.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      "it-IT": {
        localeName: "Italiano",
        INSTRUCTIONS_TITLE: "Griglia di memoria",
        INSTRUCTIONS_TEXT_PAGE_1: "Per questa attivit\xE0, cerca di ricordare la posizione di {{NUMBER_OF_DOTS}} punti.",
        INSTRUCTIONS_TEXT_PAGE_2: "Prima di piazzare i {{NUMBER_OF_DOTS}} punti al loro posto, dovrai toccare delle lettere 'F' sullo schermo, il pi\xF9 velocemente possibile.",
        INSTRUCTIONS_TEXT_PAGE_3: "Premi INIZIA per cominciare!",
        GET_READY: "PREPARATI",
        REMEMBER_LOCATIONS: "Ricorda la posizione dei punti!",
        TOUCH_INTERFERENCE: "Tocca le F!",
        DONE_BUTTON_TEXT: "Fatto",
        WHERE_WERE: "Dove erano i punti?",
        MUST_SELECT: "Devi selezionare tutte le {{NUMBER_OF_DOTS}} posizioni!",
        START_BUTTON_TEXT: "INIZIA",
        NEXT_BUTTON_TEXT: "Avanti",
        BACK_BUTTON_TEXT: "Indietro",
        TRIALS_COMPLETE_SCENE_TEXT: "Attivit\xE0 completata.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      }
      // cSpell:enable
    };
    const img_default_size = 200;
    const options = {
      name: "Grid Memory",
      /**
       * This id must match the property m2c2kit.assessmentId in package.json
       */
      id: "grid-memory",
      publishUuid: "50ee0af4-d013-408f-a7d1-c8d5c04da920",
      version: "0.8.31 (92cfffbe)",
      moduleMetadata: { "name": "@m2c2kit/assessment-grid-memory", "version": "0.8.31", "dependencies": { "@m2c2kit/addons": "0.3.32", "@m2c2kit/core": "0.3.33", "@m2c2kit/data-calc": "0.8.4" } },
      translation,
      shortDescription: "Grid Memory is a visuospatial working memory task, with delayed free recall. After a brief exposure, and a short distraction phase, participants report the location of dots on a grid.",
      longDescription: 'Each trial of the dot memory task consisted of 3 phases: encoding,   distraction, and retrieval. During the encoding phase, the participant was   asked to remember the location three red dots appear on a 5 x 5 grid. After   a 3-second study period, the grid was removed and the distraction phase   began, during which the participant was required to locate and touch Fs among   an array of Es. After performing the distraction task for 8 seconds, and   empty 5 x 5 grid reappeared on the screen and participants were then   prompted to recall the locations of the 3 dots presented initially and press   a button labeled "Done" after entering their responses to complete the trial.   Participants completed 2 trials (encoding, distractor, retrieval) with a   1-second delay between trials. The dependent variable was an error score with   partial credit given based on the deviation from the correct positions. If   all dots were recalled in their correct location, the participant received a   score of zero. In the case of one or more retrieval errors, Euclidean distance   of the location of the incorrect dot to the correct grid location was   calculated, with higher scores indicating less accurate placement and poorer   performance (Siedlecki, 2007). The rationale for our use of this task as an   indicator of working memory has both an empirical and theoretical basis.   Previous research (Miyake, Friedman, Rettinger, Shah, & Hegarty, 2001) has   demonstrated that a similar dotmemory task loaded on a factor representing   working memory. The authors of this study reasoned that the spatial dot   memory task placed high demands on controlled attention\u2014a hallmark of working   memory tasks. Indeed, individual differences in working memory capacity arise   "in situations where information needs to be actively maintained or when a   controlled search of memory is required" (Unsworth & Engle, 2007, p. 123).   The ambulatory dot memory task satisfies this requirement by using an   interference task to prevent rehearsal and produce interference with encoded   locations, which creates the demand for active maintenance and controlled   retrieval of previously encoded location during the recall phase.   SOURCE: Sliwinski, Martin J., Jacqueline A. Mogle, Jinshil Hyun, Elizabeth   Munoz, Joshua M. Smyth, and Richard B. Lipton. "Reliability and validity of   ambulatory cognitive assessments." Assessment 25, no. 1 (2018): 14-30.',
      showFps: defaultParameters.show_fps.default,
      width: 400,
      height: 800,
      trialSchema: gridMemoryTrialSchema,
      scoringSchema: gridMemoryScoringSchema,
      parameters: defaultParameters,
      fonts: [
        {
          fontName: "roboto",
          url: "fonts/roboto/Roboto-Regular.ttf"
        }
      ],
      images: [
        {
          imageName: "grid",
          height: img_default_size,
          width: img_default_size,
          url: "images/dotmem1_grid.png"
        },
        {
          imageName: "fs",
          height: img_default_size,
          width: img_default_size,
          url: "images/dotmem2_fs.png"
        },
        {
          imageName: "circle-x",
          height: 32,
          width: 32,
          // the svg is from evericons and is licensed under CC0 1.0
          // Universal (Public Domain). see https://www.patreon.com/evericons
          url: "images/circle-x.svg"
        }
      ]
    };
    super(options);
  }
  async initialize() {
    await super.initialize();
    const game = this;
    const seed = game.getParameter("seed");
    if (typeof seed === "string") {
      RandomDraws.setSeed(seed);
    }
    let presentedCells;
    let selectedCells;
    let userDotActions;
    let userInterferenceActions;
    const NUMBER_OF_DOTS = game.getParameter("number_of_dots");
    if (game.getParameter("show_quit_button")) {
      const quitSprite = new Sprite({
        imageName: "circle-x",
        position: { x: 380, y: 20 },
        isUserInteractionEnabled: true
      });
      game.addFreeNode(quitSprite);
      quitSprite.onTapDown((e) => {
        game.removeAllFreeNodes();
        e.handled = true;
        const blankScene = new Scene();
        game.addScene(blankScene);
        game.presentScene(blankScene);
        game.addTrialData("quit_button_pressed", true);
        game.trialComplete();
        if (game.getParameter("scoring")) {
          const scores = game.calculateScores([], {
            numberOfDots: game.getParameter("number_of_dots"),
            numberOfTrials: game.getParameter("number_of_trials")
          });
          game.addScoringData(scores);
          game.scoringComplete();
        }
        game.cancel();
      });
    }
    let localePicker;
    if (game.getParameter("show_locale_picker")) {
      localePicker = new LocalePicker();
      game.addFreeNode(localePicker);
    }
    let instructionsScenes;
    const customInstructions = game.getParameter(
      "instructions"
    );
    if (customInstructions) {
      instructionsScenes = Instructions.create(customInstructions);
    } else {
      if (!this.i18n) {
        throw new M2Error$1("No i18n object found.");
      }
      instructionsScenes = Instructions.create({
        instructionScenes: [
          {
            title: "INSTRUCTIONS_TITLE",
            text: "INSTRUCTIONS_TEXT_PAGE_1",
            textInterpolation: { NUMBER_OF_DOTS: NUMBER_OF_DOTS.toString() },
            imageName: "grid",
            imageAboveText: false,
            imageMarginTop: 12,
            textFontSize: 24,
            titleFontSize: 30,
            textVerticalBias: 0.25,
            nextButtonText: "NEXT_BUTTON_TEXT",
            backButtonText: "BACK_BUTTON_TEXT"
          },
          {
            title: "INSTRUCTIONS_TITLE",
            text: "INSTRUCTIONS_TEXT_PAGE_2",
            textInterpolation: { NUMBER_OF_DOTS: NUMBER_OF_DOTS.toString() },
            imageName: "fs",
            imageAboveText: false,
            imageMarginTop: 12,
            textFontSize: 24,
            titleFontSize: 30,
            textVerticalBias: 0.25,
            nextButtonText: "NEXT_BUTTON_TEXT",
            backButtonText: "BACK_BUTTON_TEXT"
          },
          {
            title: "INSTRUCTIONS_TITLE",
            text: "INSTRUCTIONS_TEXT_PAGE_3",
            textFontSize: 24,
            titleFontSize: 30,
            textAlignmentMode: LabelHorizontalAlignmentMode.Center,
            nextButtonText: "START_BUTTON_TEXT",
            nextButtonBackgroundColor: WebColors.Green,
            backButtonText: "BACK_BUTTON_TEXT"
          }
        ]
      });
    }
    instructionsScenes[0].onAppear(() => {
      game.addTrialData(
        "activity_begin_iso8601_timestamp",
        this.beginIso8601Timestamp
      );
    });
    game.addScenes(instructionsScenes);
    let forward_into_interference_scene_transition;
    let back_from_interference_scene_transition;
    if (game.getParameter("interference_transition_animation")) {
      forward_into_interference_scene_transition = Transition.slide({
        direction: TransitionDirection.Left,
        duration: 500,
        easing: Easings.sinusoidalInOut
      });
      back_from_interference_scene_transition = Transition.slide({
        direction: TransitionDirection.Right,
        duration: 500,
        easing: Easings.sinusoidalInOut
      });
    }
    const countdownScene = new CountdownScene({
      milliseconds: 3e3,
      // No message, because we show "Get Ready" before each trial
      text: "",
      zeroDwellMilliseconds: 1e3,
      transition: Transition.none()
    });
    game.addScene(countdownScene);
    const preparationScene = new Scene();
    game.addScene(preparationScene);
    const getReadyMessage = new Label({
      text: "GET_READY",
      fontSize: 24,
      position: { x: 200, y: 400 }
    });
    preparationScene.addChild(getReadyMessage);
    preparationScene.onAppear(() => {
      preparationScene.run(
        Action.sequence([
          Action.custom({
            callback: () => {
              game.addTrialData(
                "activity_begin_iso8601_timestamp",
                this.beginIso8601Timestamp
              );
              game.addTrialData(
                "trial_begin_iso8601_timestamp",
                (/* @__PURE__ */ new Date()).toISOString()
              );
            }
          }),
          Action.wait({
            duration: game.getParameter("preparation_duration_ms")
          }),
          Action.custom({
            callback: () => {
              game.presentScene(dotPresentationScene);
            }
          })
        ])
      );
    });
    const dotPresentationScene = new Scene();
    game.addScene(dotPresentationScene);
    const rememberDotsMessage = new Label({
      text: "REMEMBER_LOCATIONS",
      fontSize: 24,
      position: { x: 200, y: 150 }
    });
    dotPresentationScene.addChild(rememberDotsMessage);
    const presentationGrid = new Grid({
      size: { width: 300, height: 300 },
      position: { x: 200, y: 400 },
      rows: 5,
      columns: 5,
      backgroundColor: WebColors.Silver,
      gridLineColor: WebColors.Black,
      gridLineWidth: 4
    });
    dotPresentationScene.addChild(presentationGrid);
    dotPresentationScene.onSetup(() => {
      rememberDotsMessage.hidden = true;
    });
    dotPresentationScene.onAppear(() => {
      rememberDotsMessage.hidden = false;
      dotPresentationScene.run(
        Action.sequence([
          Action.wait({
            duration: game.getParameter("blank_grid_duration_ms")
          }),
          Action.custom({
            callback: () => {
              presentedCells = RandomDraws.fromGridWithoutReplacement(
                NUMBER_OF_DOTS,
                5,
                5
              );
              for (let i = 0; i < NUMBER_OF_DOTS; i++) {
                const circle = new Shape({
                  circleOfRadius: 20,
                  fillColor: WebColors.Red,
                  strokeColor: WebColors.Black,
                  lineWidth: 2
                });
                presentationGrid.addAtCell(
                  circle,
                  presentedCells[i].row,
                  presentedCells[i].column
                );
              }
            }
          }),
          Action.wait({
            duration: game.getParameter("dot_present_duration_ms")
          }),
          Action.custom({
            callback: () => {
              presentationGrid.removeAllGridChildren();
              rememberDotsMessage.hidden = true;
              game.presentScene(
                interferenceScene,
                forward_into_interference_scene_transition
              );
            }
          })
        ])
      );
    });
    const interferenceScene = new Scene();
    game.addScene(interferenceScene);
    const touchTheFs = new Label({
      text: "TOUCH_INTERFERENCE",
      fontSize: 24,
      position: { x: 200, y: 100 }
    });
    interferenceScene.addChild(touchTheFs);
    const interferenceGrid = new Grid({
      size: { width: 300, height: 480 },
      position: { x: 200, y: 400 },
      rows: 8,
      columns: 5,
      backgroundColor: WebColors.Transparent,
      gridLineColor: WebColors.Transparent
    });
    interferenceScene.addChild(interferenceGrid);
    const FCellsRandomization = new Array();
    for (let i = 0; i < 10; i++) {
      FCellsRandomization.push(
        RandomDraws.fromGridWithoutReplacement(
          game.getParameter("number_of_interference_targets"),
          8,
          5
        )
      );
    }
    interferenceScene.onSetup(() => {
      userInterferenceActions = new Array();
      Timer.startNew("interferenceResponseTime");
      touchTheFs.hidden = true;
      ShowInterferenceActivity();
      interferenceScene.run(
        Action.sequence([
          Action.wait({
            duration: game.getParameter("interference_duration_ms")
          }),
          Action.custom({
            callback: () => {
              Timer.remove("interferenceResponseTime");
              game.presentScene(
                dotRecallScene,
                back_from_interference_scene_transition
              );
            }
          })
        ]),
        "advanceAfterInterference"
      );
      function ShowInterferenceActivity(slideGridIntoScene = false) {
        interferenceGrid.removeAllGridChildren();
        let tappedFCount = 0;
        const number_of_interference_targets = game.getParameter(
          "number_of_interference_targets"
        );
        let FCells = FCellsRandomization.pop();
        if (!FCells) {
          FCells = RandomDraws.fromGridWithoutReplacement(
            number_of_interference_targets,
            8,
            5
          );
        }
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 5; j++) {
            const square = new Shape({
              rect: { size: { width: 59, height: 59 } },
              fillColor: WebColors.Transparent
            });
            let letterIsF = false;
            let letter;
            letter = new Label({ text: "E", fontSize: 50 });
            for (let k = 0; k < number_of_interference_targets; k++) {
              if (FCells[k].row === i && FCells[k].column === j) {
                letter = new Label({ text: "F", fontSize: 50 });
                letterIsF = true;
              }
            }
            square.userData = {};
            square.userData.row = i;
            square.userData.column = j;
            if (letterIsF) {
              square.userData.tapStatus = 0;
            } else {
              square.userData.tapStatus = -1;
            }
            square.isUserInteractionEnabled = true;
            square.onTapDown((e) => {
              if (square.userData.tapStatus === 0) {
                tappedFCount++;
                letter.text = "E";
                letter.run(
                  Action.sequence([
                    Action.scale({ scale: 1.25, duration: 125 }),
                    Action.scale({ scale: 1, duration: 125 })
                  ])
                );
                square.userData.tapStatus = 1;
                if (tappedFCount >= number_of_interference_targets) {
                  interferenceGrid.gridChildren.forEach((cell) => {
                    cell.node.isUserInteractionEnabled = false;
                  });
                  ShowInterferenceActivity(true);
                }
                if (Timer.exists("interferenceResponseTime")) {
                  userInterferenceActions.push({
                    elapsed_duration_ms: Timer.elapsed(
                      "interferenceResponseTime"
                    ),
                    action_type: "on-target",
                    cell: {
                      row: square.userData.row,
                      column: square.userData.column,
                      tap_x: e.point.x,
                      tap_y: e.point.y
                    }
                  });
                }
              } else {
                if (Timer.exists("interferenceResponseTime")) {
                  userInterferenceActions.push({
                    elapsed_duration_ms: Timer.elapsed(
                      "interferenceResponseTime"
                    ),
                    action_type: "off-target",
                    cell: {
                      row: square.userData.row,
                      column: square.userData.column,
                      tap_x: e.point.x,
                      tap_y: e.point.y
                    }
                  });
                }
              }
            });
            interferenceGrid.addAtCell(letter, i, j);
            interferenceGrid.addAtCell(square, i, j);
          }
        }
        if (slideGridIntoScene) {
          interferenceGrid.position = { x: 200, y: 1040 };
          interferenceGrid.run(
            Action.move({ point: { x: 200, y: 400 }, duration: 500 })
          );
        }
      }
    });
    interferenceScene.onAppear(() => {
      touchTheFs.hidden = false;
    });
    const dotRecallScene = new Scene();
    game.addScene(dotRecallScene);
    const whereDotsMessage = new Label({
      text: "WHERE_WERE",
      fontSize: 24,
      position: { x: 200, y: 150 }
    });
    dotRecallScene.addChild(whereDotsMessage);
    const recallGrid = new Grid({
      size: { width: 300, height: 300 },
      position: { x: 200, y: 400 },
      rows: 5,
      columns: 5,
      backgroundColor: WebColors.Silver,
      gridLineColor: WebColors.Black,
      gridLineWidth: 4
    });
    dotRecallScene.addChild(recallGrid);
    let tappedCellCount = 0;
    dotRecallScene.onSetup(() => {
      Timer.startNew("responseTime");
      recallGrid.removeAllGridChildren();
      recallDoneButton.hidden = true;
      whereDotsMessage.hidden = true;
      tappedCellCount = 0;
      selectedCells = new Array();
      userDotActions = new Array();
      for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
          const cell = new Shape({
            // this rectangle will be the hit area for the cell
            // it's transparent -- we use it only for its hit
            // area. Make it 59 x 59 (not 60 x 60) to avoid overlap
            // of hit area on the borders
            rect: { size: { width: 59, height: 59 } },
            fillColor: WebColors.Transparent
          });
          cell.userData = 0;
          cell.onTapDown((e) => {
            if (cell.userData === 0 && tappedCellCount < NUMBER_OF_DOTS) {
              const circle = new Shape({
                circleOfRadius: 20,
                fillColor: WebColors.Red,
                strokeColor: WebColors.Black,
                lineWidth: 2
              });
              cell.addChild(circle);
              cell.userData = 1;
              tappedCellCount++;
              selectedCells.push({ row: i, column: j });
              userDotActions.push({
                elapsed_duration_ms: Timer.elapsed("responseTime"),
                action_type: "placed",
                cell: {
                  row: i,
                  column: j,
                  tap_x: e.point.x,
                  tap_y: e.point.y
                }
              });
            } else if (cell.userData === 1) {
              cell.removeAllChildren();
              cell.userData = 0;
              tappedCellCount--;
              selectedCells = selectedCells.filter(
                (cell2) => !(cell2.row === i && cell2.column === j)
              );
              userDotActions.push({
                elapsed_duration_ms: Timer.elapsed("responseTime"),
                action_type: "removed",
                cell: {
                  row: i,
                  column: j,
                  tap_x: e.point.x,
                  tap_y: e.point.y
                }
              });
            }
          });
          cell.isUserInteractionEnabled = true;
          recallGrid.addAtCell(cell, i, j);
        }
      }
    });
    dotRecallScene.onAppear(() => {
      recallDoneButton.hidden = false;
      whereDotsMessage.hidden = false;
    });
    const recallDoneButton = new Button({
      text: "DONE_BUTTON_TEXT",
      position: { x: 200, y: 700 },
      size: { width: 250, height: 50 }
    });
    dotRecallScene.addChild(recallDoneButton);
    const youMustSelectAllMessage = new Label({
      text: "MUST_SELECT",
      interpolation: { NUMBER_OF_DOTS: NUMBER_OF_DOTS.toString() },
      position: { x: 200, y: 600 },
      hidden: true
    });
    dotRecallScene.addChild(youMustSelectAllMessage);
    recallDoneButton.isUserInteractionEnabled = true;
    recallDoneButton.onTapDown(() => {
      const doneButtonElapsedMs = Timer.elapsed("responseTime");
      userDotActions.push({
        elapsed_duration_ms: doneButtonElapsedMs,
        action_type: "done",
        cell: null
      });
      if (tappedCellCount < NUMBER_OF_DOTS) {
        youMustSelectAllMessage.run(
          Action.sequence([
            Action.custom({
              callback: () => {
                youMustSelectAllMessage.hidden = false;
              }
            }),
            Action.wait({ duration: 3e3 }),
            Action.custom({
              callback: () => {
                youMustSelectAllMessage.hidden = true;
              }
            })
          ])
        );
      } else {
        Timer.stop("responseTime");
        Timer.remove("responseTime");
        game.addTrialData(
          "trial_end_iso8601_timestamp",
          (/* @__PURE__ */ new Date()).toISOString()
        );
        game.addTrialData("response_time_duration_ms", doneButtonElapsedMs);
        game.addTrialData("presented_cells", presentedCells);
        game.addTrialData("selected_cells", selectedCells);
        game.addTrialData("user_dot_actions", userDotActions);
        game.addTrialData("user_interference_actions", userInterferenceActions);
        const cellsEqual = (cell1, cell2) => {
          return cell1.row === cell2.row && cell1.column === cell2.column;
        };
        const numberOfCorrectDots = selectedCells.map(
          (selectedCell) => presentedCells.some(
            (presentedCell) => cellsEqual(presentedCell, selectedCell)
          ) ? 1 : 0
        ).reduce((a, b) => a + b, 0);
        game.addTrialData("number_of_correct_dots", numberOfCorrectDots);
        game.addTrialData("quit_button_pressed", false);
        game.addTrialData("trial_index", game.trialIndex);
        game.trialComplete();
        if (game.trialIndex === game.getParameter("number_of_trials")) {
          if (game.getParameter("scoring")) {
            const scores = game.calculateScores(game.data.trials, {
              numberOfDots: game.getParameter("number_of_dots"),
              numberOfTrials: game.getParameter("number_of_trials")
            });
            game.addScoringData(scores);
            game.scoringComplete();
          }
          const nextScreenTransition = Transition.slide({
            direction: TransitionDirection.Left,
            duration: 500,
            easing: Easings.sinusoidalInOut
          });
          if (game.getParameter("show_trials_complete_scene")) {
            game.presentScene(doneScene, nextScreenTransition);
          } else {
            game.end();
          }
        } else {
          game.presentScene(preparationScene);
        }
      }
    });
    const doneScene = new Scene();
    game.addScene(doneScene);
    const doneSceneText = new Label({
      text: "TRIALS_COMPLETE_SCENE_TEXT",
      position: { x: 200, y: 400 }
    });
    doneScene.addChild(doneSceneText);
    const okButton = new Button({
      text: "TRIALS_COMPLETE_SCENE_BUTTON_TEXT",
      position: { x: 200, y: 600 }
    });
    okButton.isUserInteractionEnabled = true;
    okButton.onTapDown(() => {
      okButton.isUserInteractionEnabled = false;
      doneScene.removeAllChildren();
      game.end();
    });
    doneScene.addChild(okButton);
    doneScene.onSetup(() => {
      game.removeAllFreeNodes();
    });
  }
  calculateScores(data, extras) {
    const dc = new DataCalc(data);
    const distances = data.map((obs) => {
      const presentedCells = obs.presented_cells;
      const selectedCells = obs.selected_cells;
      if (presentedCells.length === 0 || selectedCells.length === 0) {
        return {
          hausdorff_distance: null
        };
      }
      return {
        hausdorff_distance: hausdorffDistance(presentedCells, selectedCells)
      };
    });
    const scores = dc.summarize({
      activity_begin_iso8601_timestamp: this.beginIso8601Timestamp,
      first_trial_begin_iso8601_timestamp: dc.arrange("trial_begin_iso8601_timestamp").slice(0).pull("trial_begin_iso8601_timestamp"),
      last_trial_end_iso8601_timestamp: dc.arrange("-trial_end_iso8601_timestamp").slice(0).pull("trial_end_iso8601_timestamp"),
      n_trials: dc.length,
      flag_trials_match_expected: dc.length === extras.numberOfTrials ? 1 : 0,
      distance_hausdorff_median: median(
        new DataCalc(distances).pull("hausdorff_distance")
      ),
      n_trials_exact_targets: dc.filter(
        (obs) => obs.number_of_correct_dots === extras.numberOfDots
      ).length,
      sum_exact_targets: sum("number_of_correct_dots")
    }).mutate({
      percent_exact_targets: (obs) => obs.n_trials === 0 ? null : obs.sum_exact_targets / (obs.n_trials * extras.numberOfDots)
    });
    return scores.observations;
  }
}
function hausdorffDistance(setA, setB) {
  if (setA.length === 0 || setB.length === 0) {
    return Infinity;
  }
  function euclideanDistance(cell1, cell2) {
    const rowDiff = cell1.row - cell2.row;
    const columnDiff = cell1.column - cell2.column;
    return Math.sqrt(rowDiff * rowDiff + columnDiff * columnDiff);
  }
  function maxMinDistance(fromSet, toSet) {
    return fromSet.reduce((maxMinDist, cellA) => {
      const minDist = toSet.reduce((minDist2, cellB) => {
        const dist = euclideanDistance(cellA, cellB);
        return dist < minDist2 ? dist : minDist2;
      }, Infinity);
      return minDist > maxMinDist ? minDist : maxMinDist;
    }, 0);
  }
  const distanceAB = maxMinDistance(setA, setB);
  const distanceBA = maxMinDistance(setB, setA);
  return Math.max(distanceAB, distanceBA);
}

export { GridMemory };
//# sourceMappingURL=index.js.map
