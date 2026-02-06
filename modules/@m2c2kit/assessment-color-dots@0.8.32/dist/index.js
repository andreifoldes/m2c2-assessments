import { Game, WebColors, RandomDraws, Sprite, Scene, M2Error as M2Error$1, Transition, Shape, Label, Action, Timer, LabelHorizontalAlignmentMode, Equal, Easings, TransitionDirection } from '@m2c2kit/core';
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
console.log("\u26AA @m2c2kit/data-calc version 0.8.5 (d289d12c)");

class ColorDots extends Game {
  constructor() {
    const defaultParameters = {
      fixation_duration_ms: {
        default: 500,
        description: "How long fixation scene is shown, milliseconds.",
        type: "number"
      },
      dot_colors: {
        type: "array",
        description: "Array of colors for dots.",
        items: {
          type: "object",
          properties: {
            colorName: {
              type: "string",
              description: "Human-friendly name of color."
            },
            rgbaColor: {
              type: "array",
              description: "Color as array, [r,g,b,a].",
              items: {
                type: "number"
              }
            }
          }
        },
        default: [
          { colorName: "black", rgbaColor: [0, 0, 0, 1] },
          { colorName: "green", rgbaColor: [0, 158, 115, 1] },
          { colorName: "yellow", rgbaColor: [240, 228, 66, 1] },
          { colorName: "blue", rgbaColor: [0, 114, 178, 1] },
          { colorName: "orange", rgbaColor: [213, 94, 0, 1] },
          { colorName: "pink", rgbaColor: [204, 121, 167, 1] }
          // These two additional colors were in the original specification
          // but not implemented: [230, 159, 0, 1], [86, 180, 233, 1]
        ]
      },
      dot_diameter: {
        default: 48,
        description: "Diameter of dots.",
        type: "number"
      },
      number_of_dots: {
        default: 3,
        description: "How many dots to present. Must be at least 3.",
        type: "integer"
      },
      dot_present_duration_ms: {
        default: 1e3,
        description: "How long the dots are shown, milliseconds.",
        type: "number"
      },
      dot_blank_duration_ms: {
        default: 750,
        description: "How long to show a blank square after dots are removed, milliseconds.",
        type: "number"
      },
      color_selected_hold_duration_ms: {
        default: 500,
        description: "How long to show a square with the dot colored by the user's choice, before advancing to next scene, milliseconds.",
        type: "number"
      },
      number_of_trials: {
        default: 5,
        description: "How many trials to run.",
        type: "integer"
      },
      show_trials_complete_scene: {
        default: true,
        type: "boolean",
        description: "After the final trial, should a completion scene be shown? Otherwise, the game will immediately end."
      },
      instruction_type: {
        default: "long",
        description: "Type of instructions to show, 'short' or 'long'.",
        type: "string",
        enum: ["short", "long"]
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
      seed: {
        type: ["string", "null"],
        default: null,
        description: "Optional seed for the seeded pseudo-random number generator. When null, the default Math.random() is used."
      },
      scoring: {
        type: "boolean",
        default: false,
        description: "Should scoring data be generated? Default is false."
      }
    };
    const colorDotsTrialSchema = {
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
        description: "ISO 8601 timestamp at the end of the trial (when user presses 'Done' after placing the dot). Null if trial was skipped."
      },
      trial_index: {
        type: ["integer", "null"],
        description: "Index of the trial within this assessment, 0-based."
      },
      square_side_length: {
        type: ["number", "null"],
        description: "Length of square side, in pixels. This is the square in which the dots are shown. Null if trial was skipped."
      },
      presented_dots: {
        description: "Configuration of dots presented to the user. Null if trial was skipped.",
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            color_name: {
              type: "string",
              description: "Human-friendly name of color."
            },
            rgba_color: {
              type: "array",
              description: "Color as array, [r,g,b,a].",
              items: {
                type: "number"
              }
            },
            location: {
              type: "object",
              description: "Location of dot.",
              properties: {
                x: {
                  type: "number",
                  description: "X coordinate of dot."
                },
                y: {
                  type: "number",
                  description: "Y coordinate of dot."
                }
              }
            }
          }
        }
      },
      color_target_dot_index: {
        description: "Index (0-based) of presented dot whose color the user was asked to recall. Null if trial was skipped.",
        type: ["integer", "null"]
      },
      color_selected: {
        description: "Color selected by user. Null if trial was skipped.",
        type: ["object", "null"],
        properties: {
          color_name: {
            type: "string",
            description: "Human-friendly name of color."
          },
          rgba_color: {
            type: "array",
            description: "Color as array, [r,g,b,a].",
            items: {
              type: "number"
            }
          }
        }
      },
      color_selected_correct: {
        type: ["boolean", "null"],
        description: "Was the color selected by the user correct? Null if trial was skipped."
      },
      location_target_dot_index: {
        description: "Index (0-based) of presented dot whose location the user was asked to recall. Null if trial was skipped.",
        type: ["integer", "null"]
      },
      location_selected: {
        description: "Location selected by user. Null if trial was skipped.",
        type: ["object", "null"],
        properties: {
          x: {
            type: "number",
            description: "X coordinate of dot."
          },
          y: {
            type: "number",
            description: "Y coordinate of dot."
          }
        }
      },
      location_selected_delta: {
        type: ["number", "null"],
        description: "Euclidean distance between location target dot and the location selected by user. Null if trial was skipped."
      },
      color_selection_response_time_ms: {
        type: ["number", "null"],
        description: "Milliseconds from the beginning of color selection task until the user taps the done button. Null if trial was skipped."
      },
      location_selection_response_time_ms: {
        type: ["number", "null"],
        description: "Milliseconds from the beginning of location selection task until the user taps the done button. Null if trial was skipped."
      },
      quit_button_pressed: {
        type: "boolean",
        description: "Was the quit button pressed?"
      }
    };
    const colorDotsScoringSchema = {
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
      flag_trials_match_expected: {
        type: "integer",
        description: "Does the number of completed and expected trials match? 1 = true, 0 = false."
      },
      participant_score: {
        type: ["number", "null"],
        description: "Participant-facing score. It is a weighted score of color identification and location accuracy. This is a simple metric to provide feedback to the participant. Null if no trials attempted."
      }
    };
    const translation = {
      configuration: {
        baseLocale: "en-US"
      },
      "en-US": {
        localeName: "English",
        INSTRUCTIONS_TITLE: "Color Dots",
        SHORT_INSTRUCTIONS_TEXT_PAGE_1: "For this activity, try to remember the location and color of 3 dots.",
        INSTRUCTIONS_TEXT_PAGE_1: "For this activity, try to remember the location and color of 3 dots.",
        INSTRUCTIONS_TEXT_PAGE_2: "Choose the color of the dot from the options at the bottom of the screen.",
        INSTRUCTIONS_TEXT_PAGE_3: "Next you are asked to place another dot. Touch the screen where you remember seeing the dot.",
        WHAT_COLOR: "What color was this dot?",
        WHERE_WAS: "Where was this dot?",
        TOUCH_TO_MOVE: "Touch the screen to move the dot",
        DONE_BUTTON_TEXT: "Done",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Next",
        BACK_BUTTON_TEXT: "Back",
        GET_READY_COUNTDOWN_TEXT: "GET READY!",
        TRIALS_COMPLETE_SCENE_TEXT: "This activity is complete.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      // cSpell:disable (for VS Code extension, Code Spell Checker)
      "es-MX": {
        localeName: "Espa\xF1ol",
        INSTRUCTIONS_TITLE: "Puntos de Color",
        SHORT_INSTRUCTIONS_TEXT_PAGE_1: "Para esta actividad, intenta recordar la ubicaci\xF3n y el color de 3 puntos.",
        INSTRUCTIONS_TEXT_PAGE_1: "Para esta actividad, intenta recordar la ubicaci\xF3n y el color de 3 puntos.",
        INSTRUCTIONS_TEXT_PAGE_2: "Escoja el color del punto de las opciones en la parte de abajo de la pantalla.",
        INSTRUCTIONS_TEXT_PAGE_3: "Luego, se te pedir\xE1 que coloques otro punto. Toca la pantalla donde recuerdas haber visto el punto.",
        WHAT_COLOR: "\xBFDe qu\xE9 color era este punto?",
        WHERE_WAS: "\xBFD\xF3nde estaba este punto?",
        TOUCH_TO_MOVE: "Toca la pantalla para mover el punto",
        DONE_BUTTON_TEXT: "Listo",
        START_BUTTON_TEXT: "COMENZAR",
        NEXT_BUTTON_TEXT: "Siguiente",
        BACK_BUTTON_TEXT: "Atr\xE1s",
        GET_READY_COUNTDOWN_TEXT: "PREP\xC1RESE",
        TRIALS_COMPLETE_SCENE_TEXT: "Esta actividad est\xE1 completa.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      }
      // cSpell:enable
    };
    const options = {
      name: "Color Dots",
      /**
       * This id must match the property m2c2kit.assessmentId in package.json
       */
      id: "color-dots",
      publishUuid: "72a1ef60-75c0-47b3-921c-aaee72cca9da",
      version: "0.8.32 (d289d12c)",
      moduleMetadata: { "name": "@m2c2kit/assessment-color-dots", "version": "0.8.32", "dependencies": { "@m2c2kit/addons": "0.3.33", "@m2c2kit/core": "0.3.34" } },
      translation,
      shortDescription: "Color Dots is cued-recall, item-location memory binding task, where after viewing 3 dots for a brief period of time, participants report: (1) the color at a cued location; (2) the location of a cued color.",
      longDescription: "Participants are asked to remember the location and color of three briefly presented, and uniquely colored dots. Each trial of this task requires two responses (subsequently referred to as stage 1 and stage 2 in the list of outcome variables): (1) reporting the color at a cued location; (2) reporting the location where a circular of a specified color previously appeared.",
      showFps: defaultParameters.show_fps.default,
      width: 400,
      height: 800,
      bodyBackgroundColor: WebColors.White,
      trialSchema: colorDotsTrialSchema,
      scoringSchema: colorDotsScoringSchema,
      parameters: defaultParameters,
      fonts: [
        {
          fontName: "roboto",
          url: "fonts/roboto/Roboto-Regular.ttf"
        }
      ],
      images: [
        {
          imageName: "cd1",
          height: 450,
          width: 350,
          url: "images/cd1.png"
        },
        {
          imageName: "cd2",
          height: 450,
          width: 350,
          url: "images/cd2.png",
          localize: true
        },
        {
          imageName: "cd3",
          height: 450,
          width: 350,
          url: "images/cd3.png",
          localize: true
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
    const SQUARE_SIDE_LENGTH = 350;
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
            numberOfTrials: game.getParameter("number_of_trials"),
            dotDiameter: game.getParameter("dot_diameter")
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
    let colorSelected;
    let selectedRgba;
    let instructionsScenes;
    const customInstructions = game.getParameter(
      "instructions"
    );
    if (customInstructions) {
      instructionsScenes = Instructions.create(customInstructions);
    } else {
      switch (game.getParameter("instruction_type")) {
        case "short": {
          instructionsScenes = Instructions.create({
            instructionScenes: [
              {
                title: "INSTRUCTIONS_TITLE",
                text: "SHORT_INSTRUCTIONS_TEXT_PAGE_1",
                imageName: "cd1",
                imageAboveText: false,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.2,
                nextButtonText: "START_BUTTON_TEXT",
                nextButtonBackgroundColor: WebColors.Green
              }
            ]
          });
          break;
        }
        case "long": {
          instructionsScenes = Instructions.create({
            instructionScenes: [
              {
                title: "INSTRUCTIONS_TITLE",
                text: "INSTRUCTIONS_TEXT_PAGE_1",
                imageName: "cd1",
                imageAboveText: false,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.2,
                nextButtonText: "NEXT_BUTTON_TEXT",
                backButtonText: "BACK_BUTTON_TEXT"
              },
              {
                title: "INSTRUCTIONS_TITLE",
                text: "INSTRUCTIONS_TEXT_PAGE_2",
                imageName: "cd2",
                imageAboveText: false,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.15,
                nextButtonText: "NEXT_BUTTON_TEXT",
                backButtonText: "BACK_BUTTON_TEXT"
              },
              {
                title: "INSTRUCTIONS_TITLE",
                text: "INSTRUCTIONS_TEXT_PAGE_3",
                imageName: "cd3",
                imageAboveText: false,
                imageMarginTop: 8,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.15,
                nextButtonText: "START_BUTTON_TEXT",
                nextButtonBackgroundColor: WebColors.Green,
                backButtonText: "BACK_BUTTON_TEXT"
              }
            ]
          });
          break;
        }
        default: {
          throw new M2Error$1("invalid value for instruction_type");
        }
      }
    }
    instructionsScenes[0].onAppear(() => {
      game.addTrialData(
        "activity_begin_iso8601_timestamp",
        this.beginIso8601Timestamp
      );
    });
    game.addScenes(instructionsScenes);
    const countdownScene = new CountdownScene({
      milliseconds: 3e3,
      text: "GET_READY_COUNTDOWN_TEXT",
      zeroDwellMilliseconds: 1e3,
      transition: Transition.none()
    });
    game.addScene(countdownScene);
    const trialConfigurations = [];
    const numberOfDots = game.getParameter("number_of_dots");
    const dotColors = game.getParameter(
      "dot_colors"
    );
    const dotDiameter = game.getParameter("dot_diameter");
    const numberOfColors = dotColors.length;
    function positionTooCloseToOtherDots(x, y, dots) {
      for (let i = 0; i < dots.length; i++) {
        const dist = Math.sqrt(
          Math.pow(x - dots[i].x, 2) + Math.pow(y - dots[i].y, 2)
        );
        if (dist < dotDiameter * 3 + 0.25 * dotDiameter) {
          return true;
        }
      }
      return false;
    }
    for (let i = 0; i < game.getParameter("number_of_trials"); i++) {
      const availableColors = JSON.parse(JSON.stringify(dotColors));
      const dots = new Array();
      for (let j = 0; j < numberOfDots; j++) {
        let x;
        let y;
        do {
          x = RandomDraws.singleFromRange(
            0 + dotDiameter / 2 + 4,
            SQUARE_SIDE_LENGTH - dotDiameter / 2 - 4
          );
          y = RandomDraws.singleFromRange(
            0 + dotDiameter / 2 + 4,
            SQUARE_SIDE_LENGTH - dotDiameter / 2 - 4
          );
        } while (positionTooCloseToOtherDots(x, y, dots));
        const colorIndex = RandomDraws.singleFromRange(
          0,
          availableColors.length - 1
        );
        const dotColor = availableColors.splice(colorIndex, 1)[0];
        const dot = {
          x,
          y,
          rgbaColor: dotColor.rgbaColor,
          colorName: dotColor.colorName
        };
        dots.push(dot);
      }
      const colorSelectionDotIndex = RandomDraws.singleFromRange(
        0,
        dots.length - 1
      );
      trialConfigurations.push({
        colorSelectionDotIndex,
        // which dot is chosen for the location selection task is not yet
        // known, because it depends on user input to color selection task.
        locationSelectionDotIndex: NaN,
        dots
      });
    }
    const fixationScene = new Scene();
    game.addScene(fixationScene);
    const fixationSceneSquare = new Shape({
      rect: { size: { width: SQUARE_SIDE_LENGTH, height: SQUARE_SIDE_LENGTH } },
      fillColor: WebColors.Transparent,
      strokeColor: WebColors.Gray,
      lineWidth: 4,
      position: { x: 200, y: 300 }
    });
    fixationScene.addChild(fixationSceneSquare);
    const plusLabel = new Label({
      text: "+",
      fontSize: 32,
      fontColor: WebColors.Black,
      localize: false
    });
    fixationSceneSquare.addChild(plusLabel);
    fixationScene.onSetup(() => {
      fixationScene.run(
        Action.sequence([
          Action.wait({ duration: game.getParameter("fixation_duration_ms") }),
          Action.custom({
            callback: () => {
              game.presentScene(dotPresentationScene);
            }
          })
        ])
      );
    });
    fixationScene.onAppear(() => {
      game.addTrialData(
        "activity_begin_iso8601_timestamp",
        this.beginIso8601Timestamp
      );
      game.addTrialData(
        "trial_begin_iso8601_timestamp",
        (/* @__PURE__ */ new Date()).toISOString()
      );
    });
    const dotPresentationScene = new Scene();
    game.addScene(dotPresentationScene);
    const dotPresentationSceneSquare = new Shape({
      rect: { size: { width: SQUARE_SIDE_LENGTH, height: SQUARE_SIDE_LENGTH } },
      fillColor: WebColors.Transparent,
      strokeColor: WebColors.Gray,
      lineWidth: 4,
      position: { x: 200, y: 300 }
    });
    dotPresentationScene.addChild(dotPresentationSceneSquare);
    const screenDots = new Array();
    dotPresentationScene.onSetup(() => {
      screenDots.length = 0;
      const trialConfiguration = trialConfigurations[game.trialIndex];
      for (const dot of trialConfiguration.dots) {
        const screenDot = {
          x: dot.x,
          y: dot.y,
          rgbaColor: dot.rgbaColor,
          colorName: dot.colorName,
          shape: new Shape({
            circleOfRadius: dotDiameter / 2,
            fillColor: dot.rgbaColor,
            position: {
              x: dot.x - SQUARE_SIDE_LENGTH / 2,
              y: dot.y - SQUARE_SIDE_LENGTH / 2
            }
          })
        };
        screenDots.push(screenDot);
        dotPresentationSceneSquare.addChild(screenDot.shape);
      }
      dotPresentationScene.run(
        Action.sequence([
          Action.wait({
            duration: game.getParameter("dot_present_duration_ms")
          }),
          Action.custom({
            callback: () => {
              dotPresentationSceneSquare.removeAllChildren();
            }
          }),
          Action.wait({ duration: game.getParameter("dot_blank_duration_ms") }),
          Action.custom({
            callback: () => {
              game.presentScene(colorSelectionScene);
            }
          })
        ])
      );
    });
    const colorSelectionScene = new Scene();
    game.addScene(colorSelectionScene);
    const colorSelectionSceneSquare = new Shape({
      rect: { size: { width: SQUARE_SIDE_LENGTH, height: SQUARE_SIDE_LENGTH } },
      fillColor: WebColors.Transparent,
      strokeColor: WebColors.Gray,
      lineWidth: 4,
      position: { x: 200, y: 300 }
    });
    colorSelectionScene.addChild(colorSelectionSceneSquare);
    const whatColorLabel = new Label({
      text: "WHAT_COLOR",
      fontSize: 24,
      position: { x: 200, y: 75 }
    });
    colorSelectionScene.addChild(whatColorLabel);
    const colorPaletteOutline = new Shape({
      position: { x: 200, y: 530 },
      fillColor: WebColors.Transparent,
      strokeColor: WebColors.Black,
      lineWidth: 2,
      rect: { width: 350, height: 60 }
    });
    colorSelectionScene.addChild(colorPaletteOutline);
    const colorPaletteGrid = new Grid({
      position: { x: 200, y: 530 },
      rows: 1,
      columns: numberOfColors,
      size: { width: 350, height: 60 },
      backgroundColor: WebColors.Transparent,
      gridLineColor: WebColors.Transparent
    });
    colorSelectionScene.addChild(colorPaletteGrid);
    let colorRt = -1;
    const colorSelectionDoneButton = new Button({
      position: { x: 200, y: 650 },
      text: "DONE_BUTTON_TEXT",
      hidden: true
    });
    colorSelectionDoneButton.onTapDown(() => {
      Timer.stop("colorRt");
      colorRt = Timer.elapsed("colorRt");
      Timer.remove("colorRt");
      game.addTrialData("color_selection_response_time_ms", colorRt);
      whatColorLabel.hidden = true;
      colorPaletteOutline.hidden = true;
      colorPaletteGrid.hidden = true;
      colorSelectionDoneButton.hidden = true;
      colorSelectionDoneButton.run(
        Action.sequence([
          Action.wait({
            duration: game.getParameter("color_selected_hold_duration_ms")
          }),
          Action.custom({
            callback: () => {
              if (!selectedRgba) {
                throw new M2Error$1("no selected color");
              }
              const colorSelectedName = dotColors.filter(
                (d) => Equal.rgbaColor(d.rgbaColor, selectedRgba)
              )[0].colorName;
              colorSelected = {
                color_name: colorSelectedName,
                rgba_color: selectedRgba
              };
              game.addTrialData("color_selected", colorSelected);
              const trialConfiguration = trialConfigurations[game.trialIndex];
              const colorTargetDot = trialConfiguration.dots[trialConfiguration.colorSelectionDotIndex];
              game.addTrialData(
                "color_selected_correct",
                Equal.rgbaColor(colorTargetDot.rgbaColor, selectedRgba)
              );
              game.presentScene(locationSelectionScene);
            }
          })
        ])
      );
    });
    colorSelectionScene.addChild(colorSelectionDoneButton);
    colorSelectionScene.onSetup(() => {
      whatColorLabel.hidden = false;
      colorPaletteOutline.hidden = false;
      colorPaletteGrid.hidden = false;
      colorSelectionSceneSquare.removeAllChildren();
      const trialConfiguration = trialConfigurations[game.trialIndex];
      const colorSelectionDotIndex = trialConfiguration.colorSelectionDotIndex;
      const colorSelectionDot = screenDots[colorSelectionDotIndex].shape.duplicate();
      colorSelectionDot.fillColor = WebColors.Transparent;
      colorSelectionDot.strokeColor = WebColors.Black;
      colorSelectionDot.lineWidth = 2;
      colorSelectionSceneSquare.addChild(colorSelectionDot);
      colorPaletteGrid.removeAllGridChildren();
      for (let i = 0; i < numberOfColors; i++) {
        const colorDot = new Shape({
          circleOfRadius: dotDiameter / 2,
          fillColor: dotColors[i].rgbaColor,
          isUserInteractionEnabled: true
        });
        colorDot.size = { width: dotDiameter, height: dotDiameter };
        colorDot.onTapDown(() => {
          colorSelectionDot.fillColor = colorDot.fillColor;
          colorSelectionDoneButton.hidden = false;
          colorSelectionDoneButton.isUserInteractionEnabled = true;
          selectedRgba = colorDot.fillColor;
        });
        colorPaletteGrid.addAtCell(colorDot, 0, i);
      }
    });
    colorSelectionScene.onAppear(() => {
      Timer.startNew("colorRt");
    });
    const locationSelectionScene = new Scene({
      isUserInteractionEnabled: true
    });
    game.addScene(locationSelectionScene);
    const locationSelectionSquare = new Shape({
      rect: { size: { width: SQUARE_SIDE_LENGTH, height: SQUARE_SIDE_LENGTH } },
      fillColor: WebColors.Transparent,
      strokeColor: WebColors.Gray,
      lineWidth: 4,
      position: { x: 200, y: 300 }
    });
    locationSelectionScene.addChild(locationSelectionSquare);
    locationSelectionSquare.onPointerDown(() => {
      currentInteractionIsDrag = false;
    });
    const whereDotText = new Label({
      text: "WHERE_WAS",
      fontSize: 24,
      position: { x: 165, y: 75 },
      preferredMaxLayoutWidth: 285,
      horizontalAlignmentMode: LabelHorizontalAlignmentMode.Left
    });
    locationSelectionScene.addChild(whereDotText);
    const touchToMoveLabel = new Label({
      text: "TOUCH_TO_MOVE",
      fontSize: 24,
      position: { x: 200, y: 530 }
    });
    locationSelectionScene.addChild(touchToMoveLabel);
    let locationSelectionDot;
    let location_target;
    function dotPositionIsFullyWithinSquare(dotPosition) {
      const dotLocation = calculatePositionWithinSquare(dotPosition);
      if (dotLocation.x < dotDiameter / 2 || dotLocation.x + dotDiameter / 2 > SQUARE_SIDE_LENGTH || dotLocation.y < dotDiameter / 2 || dotLocation.y + dotDiameter / 2 > SQUARE_SIDE_LENGTH) {
        return false;
      } else {
        return true;
      }
    }
    function dotPositionIsWithinSquare(dotPosition) {
      const dotLocation = calculatePositionWithinSquare(dotPosition);
      if (dotLocation.x < 0 || dotLocation.x > SQUARE_SIDE_LENGTH || dotLocation.y < 0 || dotLocation.y > SQUARE_SIDE_LENGTH) {
        return false;
      } else {
        return true;
      }
    }
    function calculatePositionWithinSquare(position) {
      const squareOrigin = locationSelectionSquare.position.x - SQUARE_SIDE_LENGTH / 2;
      const squareOriginY = locationSelectionSquare.position.y - SQUARE_SIDE_LENGTH / 2;
      const x = position.x - squareOrigin;
      const y = position.y - squareOriginY;
      return { x, y };
    }
    let currentInteractionIsDrag = false;
    locationSelectionScene.onPointerUp((pointerEvent) => {
      if (currentInteractionIsDrag) {
        return;
      }
      if (!dotPositionIsWithinSquare(pointerEvent.point)) {
        return;
      }
      locationSelectionDot.position = {
        x: pointerEvent.point.x,
        y: pointerEvent.point.y
      };
      if (dotPositionIsFullyWithinSquare(locationSelectionDot.position)) {
        locationSelectionDoneButton.hidden = false;
      } else {
        locationSelectionDoneButton.hidden = true;
      }
    });
    locationSelectionScene.onSetup(() => {
      const trialConfiguration = trialConfigurations[game.trialIndex];
      const colorSelectionDotIndex = trialConfiguration.colorSelectionDotIndex;
      locationSelectionDoneButton.hidden = true;
      locationSelectionSquare.removeAllChildren();
      const priorColorSelectedDot = new Shape({
        circleOfRadius: dotDiameter / 2,
        fillColor: selectedRgba,
        strokeColor: WebColors.Black,
        lineWidth: 2,
        position: {
          x: trialConfiguration.dots[colorSelectionDotIndex].x - SQUARE_SIDE_LENGTH / 2,
          y: trialConfiguration.dots[colorSelectionDotIndex].y - SQUARE_SIDE_LENGTH / 2
        }
      });
      locationSelectionSquare.addChild(priorColorSelectedDot);
      let locationSelectionDotIndex = -1;
      do {
        locationSelectionDotIndex = RandomDraws.singleFromRange(
          0,
          numberOfDots - 1
        );
        if (Equal.rgbaColor(
          trialConfiguration.dots[locationSelectionDotIndex].rgbaColor,
          selectedRgba
        )) {
          locationSelectionDotIndex = -1;
        }
        if (locationSelectionDotIndex === colorSelectionDotIndex) {
          locationSelectionDotIndex = -1;
        }
      } while (locationSelectionDotIndex === -1);
      trialConfiguration.locationSelectionDotIndex = locationSelectionDotIndex;
      locationSelectionDot = new Shape({
        circleOfRadius: dotDiameter / 2,
        fillColor: trialConfiguration.dots[locationSelectionDotIndex].rgbaColor,
        position: { x: 345, y: 75 },
        isUserInteractionEnabled: true,
        draggable: true
      });
      locationSelectionScene.addChild(locationSelectionDot);
      location_target = {
        x: trialConfiguration.dots[locationSelectionDotIndex].x,
        y: trialConfiguration.dots[locationSelectionDotIndex].y,
        color_name: trialConfiguration.dots[locationSelectionDotIndex].colorName,
        color_rgba: trialConfiguration.dots[locationSelectionDotIndex].rgbaColor
      };
      const presentedDots = [];
      for (let i = 0; i < trialConfiguration.dots.length; i++) {
        const dot = {
          color_name: trialConfiguration.dots[i].colorName,
          rgba_color: trialConfiguration.dots[i].rgbaColor,
          location: {
            x: trialConfiguration.dots[i].x,
            y: trialConfiguration.dots[i].y
          }
        };
        presentedDots.push(dot);
      }
      game.addTrialData("presented_dots", presentedDots);
      game.addTrialData(
        "color_target_dot_index",
        trialConfiguration.colorSelectionDotIndex
      );
      game.addTrialData(
        "location_target_dot_index",
        trialConfiguration.locationSelectionDotIndex
      );
      if (!selectedRgba) {
        throw new M2Error$1("no selected color!");
      }
      priorColorSelectedDot.fillColor = selectedRgba;
      locationSelectionDot.onTapDown((tapEvent) => {
        tapEvent.handled = true;
      });
      locationSelectionDot.onDragStart(() => {
        currentInteractionIsDrag = true;
      });
      locationSelectionDot.onDrag(() => {
        if (dotPositionIsFullyWithinSquare(locationSelectionDot.position)) {
          locationSelectionDoneButton.hidden = false;
        } else {
          locationSelectionDoneButton.hidden = true;
        }
      });
      locationSelectionDot.onDragEnd(() => {
        currentInteractionIsDrag = false;
        if (dotPositionIsFullyWithinSquare(locationSelectionDot.position)) {
          locationSelectionDoneButton.hidden = false;
        } else {
          locationSelectionDoneButton.hidden = true;
        }
      });
    });
    locationSelectionScene.onAppear(() => {
      Timer.startNew("locationRt");
    });
    let locationRt = -1;
    const locationSelectionDoneButton = new Button({
      position: { x: 200, y: 650 },
      text: "DONE_BUTTON_TEXT",
      hidden: true,
      isUserInteractionEnabled: true
    });
    locationSelectionDoneButton.onTapDown(() => {
      Timer.stop("locationRt");
      locationRt = Timer.elapsed("locationRt");
      Timer.remove("locationRt");
      game.addTrialData("location_selection_response_time_ms", locationRt);
      game.addTrialData(
        "trial_end_iso8601_timestamp",
        (/* @__PURE__ */ new Date()).toISOString()
      );
      locationSelectionScene.removeChild(locationSelectionDot);
      const location_selected = calculatePositionWithinSquare(
        locationSelectionDot.position
      );
      game.addTrialData("location_selected", location_selected);
      game.addTrialData("square_side_length", SQUARE_SIDE_LENGTH);
      const delta = Math.sqrt(
        Math.pow(location_selected.x - location_target.x, 2) + Math.pow(location_selected.y - location_target.y, 2)
      );
      game.addTrialData("location_selected_delta", delta);
      game.addTrialData("quit_button_pressed", false);
      game.addTrialData("trial_index", game.trialIndex);
      game.trialComplete();
      if (game.trialIndex < game.getParameter("number_of_trials")) {
        game.presentScene(fixationScene);
      } else {
        if (game.getParameter("scoring")) {
          const scores = game.calculateScores(game.data.trials, {
            numberOfTrials: game.getParameter("number_of_trials"),
            dotDiameter: game.getParameter("dot_diameter")
          });
          game.addScoringData(scores);
          game.scoringComplete();
        }
        if (game.getParameter("show_trials_complete_scene")) {
          game.presentScene(
            doneScene,
            Transition.slide({
              direction: TransitionDirection.Left,
              duration: 500,
              easing: Easings.sinusoidalInOut
            })
          );
        } else {
          game.end();
        }
      }
    });
    locationSelectionScene.addChild(locationSelectionDoneButton);
    const doneScene = new Scene();
    game.addScene(doneScene);
    const doneSceneText = new Label({
      text: "TRIALS_COMPLETE_SCENE_TEXT",
      position: { x: 200, y: 400 }
    });
    doneScene.addChild(doneSceneText);
    const okButton = new Button({
      text: "TRIALS_COMPLETE_SCENE_BUTTON_TEXT",
      position: { x: 200, y: 650 }
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
    const maxDistanceWithinSquare = (s, p, buffer) => {
      const corners = [
        { x: buffer, y: buffer },
        { x: s - buffer, y: buffer },
        { x: buffer, y: s - buffer },
        { x: s - buffer, y: s - buffer }
      ];
      return corners.reduce((maxDist, corner) => {
        const dx = p.x - corner.x;
        const dy = p.y - corner.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return Math.max(maxDist, dist);
      }, 0);
    };
    const dc = new DataCalc(data);
    const scores = dc.mutate({
      trial_score: (obs) => {
        const maxDistance = maxDistanceWithinSquare(
          obs.square_side_length,
          obs.presented_dots[obs.location_target_dot_index].location,
          extras.dotDiameter / 2
        );
        return ((obs.color_selected_correct ? 0.5 : 0) + (maxDistance - obs.location_selected_delta) / maxDistance * 0.5) / extras.numberOfTrials * 100;
      }
    }).summarize({
      activity_begin_iso8601_timestamp: this.beginIso8601Timestamp,
      first_trial_begin_iso8601_timestamp: dc.arrange("trial_begin_iso8601_timestamp").slice(0).pull("trial_begin_iso8601_timestamp"),
      last_trial_end_iso8601_timestamp: dc.arrange("-trial_end_iso8601_timestamp").slice(0).pull("trial_end_iso8601_timestamp"),
      n_trials: dc.length,
      flag_trials_match_expected: dc.length === extras.numberOfTrials ? 1 : 0,
      participant_score: sum("trial_score")
    });
    return scores.observations;
  }
}

export { ColorDots };
//# sourceMappingURL=index.js.map
