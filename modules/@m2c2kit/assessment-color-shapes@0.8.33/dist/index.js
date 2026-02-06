import { Game, RandomDraws, Sprite, Scene, M2Error as M2Error$1, WebColors, Transition, Shape, Label, Action, Timer, Easings, TransitionDirection } from '@m2c2kit/core';
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
   * variable has length > 1, an array of values is returned. If an empty
   * dataset is provided, `null` is returned and a warning is logged.
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
console.log("\u26AA @m2c2kit/data-calc version 0.8.6 (c86b5047)");

class ColorShapes extends Game {
  constructor() {
    const defaultParameters = {
      fixation_duration_ms: {
        default: 500,
        description: "How long fixation scene is shown, milliseconds.",
        type: "number"
      },
      shape_colors: {
        type: "array",
        description: "Array of colors for shapes.",
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
        ]
      },
      number_of_shapes_shown: {
        default: 3,
        description: "How many shapes to show on the grid at one time.",
        type: "integer"
      },
      number_of_shapes_changing_color: {
        default: 2,
        description: "If a different color trial, how many shapes should change color (minimum is 2, because changes are swaps with other shapes).",
        type: "integer"
      },
      shapes_presented_duration_ms: {
        default: 2e3,
        description: "How long the shapes are shown, milliseconds.",
        type: "number"
      },
      shapes_removed_duration_ms: {
        default: 1e3,
        description: "How long to show a blank square after shapes are removed, milliseconds.",
        type: "number"
      },
      cells_per_side: {
        default: 3,
        description: "How many cell positions for each side of the square grid (e.g., 3 is a 3x3 grid; 4 is a 4x4 grid).",
        type: "integer"
      },
      number_of_different_colors_trials: {
        default: 6,
        type: "integer",
        description: "Number of trials where the shapes have different colors."
      },
      number_of_trials: {
        default: 12,
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
    const colorShapesTrialSchema = {
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
        description: "ISO 8601 timestamp at the end of the trial (when user presses 'Same' or 'Different'). Null if trial was skipped."
      },
      trial_index: {
        type: ["integer", "null"],
        description: "Index of the trial within this assessment, 0-based."
      },
      present_shapes: {
        description: "Configuration of shapes shown to the user in the presentation phase. Null if trial was skipped.",
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            shape_index: {
              type: "integer",
              description: "Index of the shape within the library of shapes, 0-based"
            },
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
              description: "Location of shape.",
              properties: {
                row: {
                  type: "number",
                  description: "Row of the shape, 0-based."
                },
                column: {
                  type: "number",
                  description: "Column of the shape, 0-based."
                }
              }
            }
          }
        }
      },
      response_shapes: {
        description: "Configuration of shapes shown to the user in the response phase. Null if trial was skipped.",
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            shape_index: {
              type: "integer",
              description: "Index of the shape within the library of shapes, 0-based"
            },
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
              description: "Location of shape.",
              properties: {
                row: {
                  type: "number",
                  description: "Row of the shape, 0-based."
                },
                column: {
                  type: "number",
                  description: "Column of the shape, 0-based."
                }
              }
            }
          }
        }
      },
      response_time_duration_ms: {
        type: ["number", "null"],
        description: "Milliseconds from when the response configuration of shapes is shown until the user taps a response. Null if trial was skipped."
      },
      user_response: {
        type: ["string", "null"],
        enum: ["same", "different"],
        description: "User's response to whether the shapes are same colors or different."
      },
      user_response_correct: {
        type: ["boolean", "null"],
        description: "Was the user's response correct?"
      },
      quit_button_pressed: {
        type: "boolean",
        description: "Was the quit button pressed?"
      }
    };
    const colorShapesScoringSchema = {
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
      n_trials_correct: {
        type: "integer",
        description: "Number of correct trials."
      },
      n_trials_incorrect: {
        type: "integer",
        description: "Number of incorrect trials."
      },
      participant_score: {
        type: ["number", "null"],
        description: "Participant-facing score, calculated as (number of correct trials / number of trials attempted) * 100. This is a simple metric to provide feedback to the participant. Null if no trials attempted."
      }
    };
    const translation = {
      configuration: {
        baseLocale: "en-US"
      },
      "en-US": {
        localeName: "English",
        INSTRUCTIONS_TITLE: "Color Shapes",
        SHORT_INSTRUCTIONS_TEXT_PAGE_1: "Try to remember the color of 3 shapes, because they will soon disappear. When the shapes reappear, answer whether they have the SAME or DIFFERENT colors as they had before",
        INSTRUCTIONS_TEXT_PAGE_1: "Try to remember the color of 3 shapes, because they will soon disappear.",
        INSTRUCTIONS_TEXT_PAGE_2: "Next you will see the same shapes reappear.",
        INSTRUCTIONS_TEXT_PAGE_3: "Answer whether the shapes have the SAME or DIFFERENT colors as they had before.",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Next",
        BACK_BUTTON_TEXT: "Back",
        GET_READY_COUNTDOWN_TEXT: "GET READY!",
        SAME_BUTTON_TEXT: "Same",
        DIFFERENT_BUTTON_TEXT: "Different",
        TRIALS_COMPLETE_SCENE_TEXT: "This activity is complete.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      // cSpell:disable (for VS Code extension, Code Spell Checker)
      "es-MX": {
        localeName: "Espa\xF1ol",
        INSTRUCTIONS_TITLE: "Formas de Color",
        // Short instructions need to be translated.
        // SHORT_INSTRUCTIONS_TEXT_PAGE_1: "",
        INSTRUCTIONS_TEXT_PAGE_1: "Intenta recordar el color de las 3 formas, porque pronto desaparecer\xE1n.",
        INSTRUCTIONS_TEXT_PAGE_2: "Luego ver\xE1s reaparecer las mismas formas.",
        INSTRUCTIONS_TEXT_PAGE_3: "Responde si las formas tienen el MISMO o DIFERENTE color que antes.",
        START_BUTTON_TEXT: "COMENZAR",
        NEXT_BUTTON_TEXT: "Siguiente",
        BACK_BUTTON_TEXT: "Atr\xE1s",
        GET_READY_COUNTDOWN_TEXT: "PREP\xC1RESE",
        SAME_BUTTON_TEXT: "Mismo",
        DIFFERENT_BUTTON_TEXT: "Diferente",
        TRIALS_COMPLETE_SCENE_TEXT: "Esta actividad est\xE1 completa.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      },
      "de-DE": {
        localeName: "Deutsch",
        INSTRUCTIONS_TITLE: "Farb-Formen",
        // Short instructions need to be translated.
        // SHORT_INSTRUCTIONS_TEXT_PAGE_1: "",
        INSTRUCTIONS_TEXT_PAGE_1: "Oben und unten sehen Sie Symbolpaare.",
        INSTRUCTIONS_TEXT_PAGE_2: "Ihre Aufgabe wird es sein, auf dasjenige untere Paar zu tippen, welches mit einem der obigen Paare exakt \xFCbereinstimmt.",
        INSTRUCTIONS_TEXT_PAGE_3: "Versuchen Sie bitte, so schnell und korrekt wie m\xF6glich zu sein.",
        START_BUTTON_TEXT: "START",
        NEXT_BUTTON_TEXT: "Weiter",
        BACK_BUTTON_TEXT: "Vorherige",
        GET_READY_COUNTDOWN_TEXT: "BEREIT MACHEN",
        SAME_BUTTON_TEXT: "Gleich",
        DIFFERENT_BUTTON_TEXT: "Unterschiedlich",
        TRIALS_COMPLETE_SCENE_TEXT: "Die Aufgabe ist beendet.",
        TRIALS_COMPLETE_SCENE_BUTTON_TEXT: "OK"
      }
      // cSpell:enable
    };
    const options = {
      name: "Color Shapes",
      /**
       * This id must match the property m2c2kit.assessmentId in package.json
       */
      id: "color-shapes",
      publishUuid: "394cb010-2ccf-4a87-9d23-cda7fb07a960",
      version: "0.8.33 (c86b5047)",
      moduleMetadata: { "name": "@m2c2kit/assessment-color-shapes", "version": "0.8.33", "dependencies": { "@m2c2kit/addons": "0.3.34", "@m2c2kit/core": "0.3.35" } },
      translation,
      shortDescription: "Color Shapes is a visual array change detection task, measuring intra-item feature binding, where participants determine if shapes change color across two sequential presentations of shape stimuli.",
      longDescription: `Color Shapes is a change detection paradigm used to measure visual short-term memory binding (Parra et al., 2009). Participants are asked to memorize the shapes and colors of three different polygons for 3 seconds. The three polygons are then removed from the screen and re-displayed at different locations, either having the same or different colors. Participants are then asked to decide whether the combination of colors and shapes are the "Same" or "Different" between the study and test phases.`,
      showFps: defaultParameters.show_fps.default,
      width: 400,
      height: 800,
      trialSchema: colorShapesTrialSchema,
      scoringSchema: colorShapesScoringSchema,
      parameters: defaultParameters,
      fonts: [
        {
          fontName: "roboto",
          url: "fonts/roboto/Roboto-Regular.ttf"
        }
      ],
      images: [
        {
          imageName: "instructions-1",
          height: 256,
          width: 256,
          url: "images/cs-instructions-1.png"
        },
        {
          imageName: "instructions-2",
          height: 256,
          width: 256,
          url: "images/cs-instructions-2.png"
        },
        {
          imageName: "instructions-3",
          height: 350,
          width: 300,
          url: "images/cs-instructions-3.png",
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
    const SHAPE_SVG_HEIGHT = 96;
    const SQUARE_SIDE_LENGTH = 350;
    const numberOfShapesShown = game.getParameter(
      "number_of_shapes_shown"
    );
    const shapeLibrary = this.makeShapes(SHAPE_SVG_HEIGHT);
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
      switch (game.getParameter("instruction_type")) {
        case "short": {
          instructionsScenes = Instructions.create({
            instructionScenes: [
              {
                title: "INSTRUCTIONS_TITLE",
                text: "SHORT_INSTRUCTIONS_TEXT_PAGE_1",
                imageName: "instructions-1",
                imageAboveText: false,
                imageMarginTop: 32,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.2,
                nextButtonText: "START_BUTTON_TEXT",
                nextButtonBackgroundColor: WebColors.Green,
                nextSceneTransition: Transition.none()
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
                imageName: "instructions-1",
                imageAboveText: false,
                imageMarginTop: 32,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.2,
                nextButtonText: "NEXT_BUTTON_TEXT",
                backButtonText: "BACK_BUTTON_TEXT"
              },
              {
                title: "INSTRUCTIONS_TITLE",
                text: "INSTRUCTIONS_TEXT_PAGE_2",
                imageName: "instructions-2",
                imageAboveText: false,
                imageMarginTop: 32,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.2,
                nextButtonText: "NEXT_BUTTON_TEXT",
                backButtonText: "BACK_BUTTON_TEXT"
              },
              {
                title: "INSTRUCTIONS_TITLE",
                text: "INSTRUCTIONS_TEXT_PAGE_3",
                imageName: "instructions-3",
                imageAboveText: false,
                imageMarginTop: 32,
                textFontSize: 24,
                titleFontSize: 30,
                textVerticalBias: 0.2,
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
    const gridRows = game.getParameter("cells_per_side");
    const gridColumns = game.getParameter("cells_per_side");
    const numberOfTrials = game.getParameter("number_of_trials");
    const shapeColors = game.getParameter(
      "shape_colors"
    );
    const trialConfigurations = [];
    const rows = game.getParameter("cells_per_side");
    const columns = rows;
    const numberOfDifferentColorsTrials = game.getParameter(
      "number_of_different_colors_trials"
    );
    const differentColorsTrialIndexes = RandomDraws.fromRangeWithoutReplacement(
      numberOfDifferentColorsTrials,
      0,
      numberOfTrials - 1
    );
    for (let i = 0; i < numberOfTrials; i++) {
      const presentShapes = new Array();
      const responseShapes = new Array();
      const shapesToShowIndexes = RandomDraws.fromRangeWithoutReplacement(
        numberOfShapesShown,
        0,
        shapeLibrary.length - 1
      );
      const shapeColorsIndexes = RandomDraws.fromRangeWithoutReplacement(
        numberOfShapesShown,
        0,
        shapeColors.length - 1
      );
      const onDiagonal = (locations) => {
        if (locations.map((c) => c.row === 0 && c.column === 0).some((e) => e === true) && locations.map((c) => c.row === 1 && c.column === 1).some((e) => e === true) && locations.map((c) => c.row === 2 && c.column === 2).some((e) => e === true)) {
          return true;
        }
        if (locations.map((c) => c.row === 2 && c.column === 0).some((e) => e === true) && locations.map((c) => c.row === 1 && c.column === 1).some((e) => e === true) && locations.map((c) => c.row === 0 && c.column === 2).some((e) => e === true)) {
          return true;
        }
        return false;
      };
      const inLine = (locations) => {
        const uniqueRows = new Set(locations.map((l) => l.row)).size;
        const uniqueColumns = new Set(locations.map((l) => l.column)).size;
        if (uniqueRows !== 1 && uniqueColumns !== 1) {
          return false;
        }
        return true;
      };
      let presentLocationsOk = false;
      let presentLocations;
      do {
        presentLocations = RandomDraws.fromGridWithoutReplacement(
          numberOfShapesShown,
          rows,
          columns
        );
        if (!inLine(presentLocations) && !onDiagonal(presentLocations)) {
          presentLocationsOk = true;
        } else {
          presentLocationsOk = false;
        }
      } while (!presentLocationsOk);
      for (let j = 0; j < numberOfShapesShown; j++) {
        const presentShape = {
          shape: shapeLibrary[shapesToShowIndexes[j]],
          shapeIndex: shapesToShowIndexes[j],
          color: shapeColors[shapeColorsIndexes[j]].rgbaColor,
          colorName: shapeColors[shapeColorsIndexes[j]].colorName,
          location: presentLocations[j]
        };
        presentShapes.push(presentShape);
      }
      let responseLocationsOk = false;
      let responseLocations;
      do {
        responseLocations = RandomDraws.fromGridWithoutReplacement(
          numberOfShapesShown,
          rows,
          columns
        );
        if (!inLine(responseLocations) && !onDiagonal(responseLocations)) {
          responseLocationsOk = true;
        } else {
          responseLocationsOk = false;
        }
      } while (!responseLocationsOk);
      for (let j = 0; j < numberOfShapesShown; j++) {
        const responseShape = {
          shape: presentShapes[j].shape,
          shapeIndex: shapesToShowIndexes[j],
          color: presentShapes[j].color,
          colorName: shapeColors[shapeColorsIndexes[j]].colorName,
          location: responseLocations[j]
        };
        responseShapes.push(responseShape);
      }
      let numberOfShapesWithDifferentColors = 0;
      const differentColorTrial = differentColorsTrialIndexes.includes(i);
      if (differentColorTrial) {
        const numberOfShapesToChange = game.getParameter(
          "number_of_shapes_changing_color"
        );
        if (numberOfShapesToChange > numberOfShapesShown) {
          throw new M2Error$1(
            `number_of_shapes_changing_color is ${numberOfShapesToChange}, but it must be less than or equal to number_of_shapes_shown (which is ${numberOfShapesShown}).`
          );
        }
        const shapesToChangeIndexes = RandomDraws.fromRangeWithoutReplacement(
          numberOfShapesToChange,
          0,
          numberOfShapesShown - 1
        );
        const shapesToChange = shapesToChangeIndexes.map(
          (index) => responseShapes[index]
        );
        numberOfShapesWithDifferentColors = shapesToChange.length;
        const firstShapeColor = shapesToChange[0].color;
        for (let j = 0; j < numberOfShapesToChange; j++) {
          const shape = shapesToChange[j];
          if (j + 1 < numberOfShapesToChange) {
            shape.color = shapesToChange[j + 1].color;
          } else {
            shape.color = firstShapeColor;
          }
        }
      }
      trialConfigurations.push({
        presentShapes,
        responseShapes,
        numberOfShapesWithDifferentColors
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
    fixationScene.onAppear(() => {
      game.addTrialData(
        "activity_begin_iso8601_timestamp",
        this.beginIso8601Timestamp
      );
      game.addTrialData(
        "trial_begin_iso8601_timestamp",
        (/* @__PURE__ */ new Date()).toISOString()
      );
      fixationScene.run(
        Action.sequence([
          Action.wait({ duration: game.getParameter("fixation_duration_ms") }),
          Action.custom({
            callback: () => {
              game.presentScene(shapePresentationScene);
            }
          })
        ])
      );
    });
    const shapePresentationScene = new Scene();
    game.addScene(shapePresentationScene);
    const presentationSceneSquare = new Shape({
      rect: { size: { width: SQUARE_SIDE_LENGTH, height: SQUARE_SIDE_LENGTH } },
      fillColor: WebColors.Transparent,
      strokeColor: WebColors.Gray,
      lineWidth: 4,
      position: { x: 200, y: 300 }
    });
    shapePresentationScene.addChild(presentationSceneSquare);
    const presentationGrid = new Grid({
      rows: gridRows,
      columns: gridColumns,
      size: { width: SQUARE_SIDE_LENGTH, height: SQUARE_SIDE_LENGTH },
      position: { x: 200, y: 300 },
      backgroundColor: WebColors.Transparent,
      gridLineColor: WebColors.Transparent
    });
    shapePresentationScene.addChild(presentationGrid);
    shapePresentationScene.onAppear(() => {
      const trialConfiguration = trialConfigurations[game.trialIndex];
      for (let i = 0; i < trialConfiguration.presentShapes.length; i++) {
        const presentShape = trialConfiguration.presentShapes[i].shape;
        presentShape.fillColor = trialConfiguration.presentShapes[i].color;
        presentShape.position = { x: 0, y: 0 };
        presentationGrid.addAtCell(
          presentShape,
          trialConfiguration.presentShapes[i].location.row,
          trialConfiguration.presentShapes[i].location.column
        );
      }
      shapePresentationScene.run(
        Action.sequence([
          Action.wait({
            duration: game.getParameter("shapes_presented_duration_ms")
          }),
          Action.custom({
            callback: () => {
              presentationGrid.removeAllGridChildren();
            }
          }),
          Action.wait({
            duration: game.getParameter("shapes_removed_duration_ms")
          }),
          Action.custom({
            callback: () => {
              presentationGrid.removeAllGridChildren();
              game.presentScene(shapeResponseScene);
            }
          })
        ])
      );
    });
    const shapeResponseScene = new Scene();
    game.addScene(shapeResponseScene);
    const responseSceneSquare = new Shape({
      rect: { size: { width: SQUARE_SIDE_LENGTH, height: SQUARE_SIDE_LENGTH } },
      fillColor: WebColors.Transparent,
      strokeColor: WebColors.Gray,
      lineWidth: 4,
      position: { x: 200, y: 300 }
    });
    shapeResponseScene.addChild(responseSceneSquare);
    const responseGrid = new Grid({
      rows: gridRows,
      columns: gridColumns,
      size: { width: SQUARE_SIDE_LENGTH, height: SQUARE_SIDE_LENGTH },
      position: { x: 200, y: 300 },
      backgroundColor: WebColors.Transparent,
      gridLineColor: WebColors.Transparent
    });
    shapeResponseScene.addChild(responseGrid);
    shapeResponseScene.onAppear(() => {
      const trialConfiguration = trialConfigurations[game.trialIndex];
      for (let i = 0; i < trialConfiguration.responseShapes.length; i++) {
        const responseShape = trialConfiguration.responseShapes[i].shape;
        responseShape.fillColor = trialConfiguration.responseShapes[i].color;
        responseShape.position = { x: 0, y: 0 };
        responseGrid.addAtCell(
          responseShape,
          trialConfiguration.responseShapes[i].location.row,
          trialConfiguration.responseShapes[i].location.column
        );
      }
      sameButton.isUserInteractionEnabled = true;
      differentButton.isUserInteractionEnabled = true;
      Timer.startNew("rt");
    });
    const sameButton = new Button({
      text: "SAME_BUTTON_TEXT",
      position: { x: 100, y: 700 },
      size: { width: 150, height: 50 }
    });
    shapeResponseScene.addChild(sameButton);
    sameButton.onTapDown(() => {
      sameButton.isUserInteractionEnabled = false;
      handleSelection(false);
    });
    const differentButton = new Button({
      text: "DIFFERENT_BUTTON_TEXT",
      position: { x: 300, y: 700 },
      size: { width: 150, height: 50 }
    });
    shapeResponseScene.addChild(differentButton);
    differentButton.onTapDown(() => {
      differentButton.isUserInteractionEnabled = false;
      handleSelection(true);
    });
    const handleSelection = (differentPressed) => {
      const rt = Timer.elapsed("rt");
      Timer.remove("rt");
      responseGrid.removeAllGridChildren();
      game.addTrialData(
        "trial_end_iso8601_timestamp",
        (/* @__PURE__ */ new Date()).toISOString()
      );
      const trialConfiguration = trialConfigurations[game.trialIndex];
      game.addTrialData("response_time_duration_ms", rt);
      game.addTrialData(
        "user_response",
        differentPressed ? "different" : "same"
      );
      const correctResponse = trialConfiguration.numberOfShapesWithDifferentColors === 0 && !differentPressed || trialConfiguration.numberOfShapesWithDifferentColors > 0 && differentPressed;
      game.addTrialData("user_response_correct", correctResponse);
      const presentShapes = trialConfiguration.presentShapes.map((p) => {
        return {
          shape_index: p.shapeIndex,
          color_name: p.colorName,
          rgba_color: p.color,
          location: p.location
        };
      });
      game.addTrialData("present_shapes", presentShapes);
      game.addTrialData("quit_button_pressed", false);
      const responseShapes = trialConfiguration.responseShapes.map((p) => {
        return {
          shape_index: p.shapeIndex,
          color_name: p.colorName,
          rgba_color: p.color,
          location: p.location
        };
      });
      game.addTrialData("response_shapes", responseShapes);
      game.addTrialData("trial_index", game.trialIndex);
      game.trialComplete();
      if (game.trialIndex < numberOfTrials) {
        game.presentScene(fixationScene);
      } else {
        if (game.getParameter("scoring")) {
          const scores = game.calculateScores(game.data.trials, {
            numberOfTrials: game.getParameter("number_of_trials")
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
    };
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
    const dc = new DataCalc(data);
    const scores = dc.summarize({
      activity_begin_iso8601_timestamp: this.beginIso8601Timestamp,
      first_trial_begin_iso8601_timestamp: dc.arrange("trial_begin_iso8601_timestamp").slice(0).pull("trial_begin_iso8601_timestamp"),
      last_trial_end_iso8601_timestamp: dc.arrange("-trial_end_iso8601_timestamp").slice(0).pull("trial_end_iso8601_timestamp"),
      n_trials: dc.length,
      flag_trials_match_expected: dc.length === extras.numberOfTrials ? 1 : 0,
      n_trials_correct: dc.filter((obs) => obs.user_response_correct === true).length,
      n_trials_incorrect: dc.filter(
        (obs) => obs.user_response_correct === false
      ).length
    }).mutate({
      participant_score: (obs) => obs.n_trials > 0 ? obs.n_trials_correct / obs.n_trials * 100 : null
    });
    return scores.observations;
  }
  makeShapes(svgHeight) {
    const shape01 = new Shape({
      path: {
        pathString: shapePathStrings[0],
        height: svgHeight
      },
      lineWidth: 0
    });
    const shape02 = new Shape({
      path: {
        pathString: shapePathStrings[1],
        height: svgHeight
      },
      lineWidth: 0
    });
    const shape03 = new Shape({
      path: {
        pathString: shapePathStrings[2],
        height: svgHeight * 0.8
      },
      lineWidth: 0
    });
    const shape04 = new Shape({
      path: {
        pathString: shapePathStrings[3],
        height: svgHeight
      },
      lineWidth: 0
    });
    const shape05 = new Shape({
      path: {
        pathString: shapePathStrings[4],
        height: svgHeight * 0.8
      },
      lineWidth: 0
    });
    const shape06 = new Shape({
      path: {
        pathString: shapePathStrings[5],
        height: svgHeight
      },
      lineWidth: 0
    });
    const shape07 = new Shape({
      path: {
        pathString: shapePathStrings[6],
        height: svgHeight
      },
      lineWidth: 0
    });
    const shape08 = new Shape({
      path: {
        pathString: shapePathStrings[7],
        height: svgHeight
      },
      lineWidth: 0
    });
    const shapes = [
      shape01,
      shape02,
      shape03,
      shape04,
      shape05,
      shape06,
      shape07,
      shape08
    ];
    return shapes;
  }
}
const shapePathStrings = [
  "M0 89.94v-2L131.95 0h2v88.7c2.34 1.6 4.47 3.11 6.65 4.55 42.77 28.22 85.54 56.42 128.3 84.63v2c-44.65 29.65-89.3 59.29-133.95 88.94h-1v-90.84C89.44 148.72 44.72 119.33 0 89.94Z",
  "M162 188c-.33 27-.67 54-1 81-26.87-26.18-53.74-52.35-80-77.94V269H0C0 180.83 0 92.67.04 4.5.04 3 .67 1.5 1 0c24.64 29.1 49.15 58.31 73.96 87.26 28.88 33.7 58.01 67.17 87.04 100.74Z",
  "M3 148.86V61.12C41.76 40.75 80.52 20.37 119.28 0h2.91c21.32 20.7 42.64 41.4 63.96 62.11v89.71c-38.44 20.04-76.88 40.09-115.31 60.13h-2.91L3.01 148.86Z",
  "M134 0h2c7.26 22.31 14.38 44.67 21.86 66.9 3.91 11.61 5.47 29.91 13.25 33.27C203 113.94 236.86 123.13 270 134v1L136 269h-1c-11.04-33.58-22.08-67.16-33.21-101.03C67.87 156.98 33.93 145.99 0 135v-1L134 0Z",
  "M107 0h1l108 108v1c-26.67 35.33-53.33 70.66-80 106h-1c-8.82-35.03-17.64-70.07-27-107.28C98.62 145.01 89.81 180 81.01 215h-1C53.33 179.66 26.67 144.33 0 109v-2L107 0Z",
  "M0 1C2.17.67 4.33.05 6.5.04 58.33-.01 110.17 0 162 0v270H2c26.2-22.17 52.41-44.33 78.86-66.71V67.4c-3.85-3.22-7.35-6.2-10.9-9.11C46.64 39.18 23.32 20.09 0 1Z",
  "M95 268.99h-1C62.66 238.66 31.33 208.33 0 178V88C26.67 58.67 53.33 29.33 80 0h1c0 29.45 0 58.89-.01 88.38 35.99 29.57 72 59.09 108.01 88.61v1l-94 91Z",
  "M13 0h67l135 135v1L81 270c-27-.33-54-.67-81-1 11.73-12.51 23.61-24.87 35.16-37.54 33.14-36.35 66.14-72.82 100.23-110.38C94.4 80.52 53.7 40.26 13 0Z"
];

export { ColorShapes };
//# sourceMappingURL=index.js.map
