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
const nInternal = (dataCalc) => {
  return dataCalc.length;
};
function n() {
  return {
    summarizeFunction: nInternal,
    parameters: []
  };
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
const meanInternal = (dataCalc, params, options) => {
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
      "mean()",
      0
    );
    if (result.containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (result.count === 0) {
      return null;
    }
    return result.state / result.count;
  } else if (Array.isArray(variableOrValues)) {
    const result = processDirectValues(
      variableOrValues,
      options,
      (value, sum2) => sum2 + value,
      "mean()",
      0
    );
    if (result.containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (result.count === 0) {
      return null;
    }
    return result.state / result.count;
  } else {
    const result = processSingleValue(variableOrValues, options, "mean()");
    return result.isMissing && !mergedOptions.skipMissing ? null : result.value;
  }
};
function mean(variableOrValues, options) {
  return {
    summarizeFunction: meanInternal,
    parameters: [variableOrValues],
    options
  };
}
const varianceInternal = (dataCalc, params, options) => {
  const variableOrValues = params[0];
  const mergedOptions = applyDefaultOptions(options);
  if (typeof variableOrValues === "string") {
    if (!dataCalc.variableExists(variableOrValues)) {
      return null;
    }
    const variable = variableOrValues;
    const meanResult = processNumericValues(
      dataCalc,
      variable,
      options,
      (value, sum2) => sum2 + value,
      "variance()",
      0
    );
    if (meanResult.containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (meanResult.count <= 1) {
      return null;
    }
    const meanValue = meanResult.state / meanResult.count;
    const varianceResult = processNumericValues(
      dataCalc,
      variable,
      options,
      (value, sum2) => {
        const actualValue = typeof value === "boolean" && mergedOptions.coerceBooleans ? value ? 1 : 0 : value;
        return sum2 + Math.pow(actualValue - meanValue, 2);
      },
      "variance()",
      0
    );
    return varianceResult.state / (meanResult.count - 1);
  } else if (Array.isArray(variableOrValues)) {
    const validValues = [];
    let containsMissing = false;
    for (const value of variableOrValues) {
      if (typeof value === "number" && !isNaN(value) && isFinite(value)) {
        validValues.push(value);
      } else if (typeof value === "boolean" && mergedOptions.coerceBooleans) {
        validValues.push(value ? 1 : 0);
      } else if (value === null || value === void 0 || typeof value === "number" && (isNaN(value) || !isFinite(value))) {
        containsMissing = true;
      } else {
        throw new M2Error(`variance(): has non-numeric value ${value}`);
      }
    }
    if (containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (validValues.length <= 1) {
      return null;
    }
    const sum2 = validValues.reduce((acc, val) => acc + val, 0);
    const mean2 = sum2 / validValues.length;
    const sumSquaredDiffs = validValues.reduce(
      (acc, val) => acc + Math.pow(val - mean2, 2),
      0
    );
    return sumSquaredDiffs / (validValues.length - 1);
  } else {
    return null;
  }
};
function variance(variableOrValues, options) {
  return {
    summarizeFunction: varianceInternal,
    parameters: [variableOrValues],
    options
  };
}
const minInternal = (dataCalc, params, options) => {
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
      (value, min2) => min2 === Number.POSITIVE_INFINITY || value < min2 ? value : min2,
      "min()",
      Number.POSITIVE_INFINITY
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
      (value, min2) => min2 === Number.POSITIVE_INFINITY || value < min2 ? value : min2,
      "min()",
      Number.POSITIVE_INFINITY
    );
    if (result.containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (result.count === 0) {
      return null;
    }
    return result.state;
  } else {
    const result = processSingleValue(variableOrValues, options, "min()");
    if (result.isMissing && !mergedOptions.skipMissing) {
      return null;
    }
    return result.isMissing ? null : result.value;
  }
};
function min(variableOrValues, options) {
  return {
    summarizeFunction: minInternal,
    parameters: [variableOrValues],
    options
  };
}
const maxInternal = (dataCalc, params, options) => {
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
      (value, max2) => max2 === Number.NEGATIVE_INFINITY || value > max2 ? value : max2,
      "max()",
      Number.NEGATIVE_INFINITY
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
      (value, max2) => max2 === Number.NEGATIVE_INFINITY || value > max2 ? value : max2,
      "max()",
      Number.NEGATIVE_INFINITY
    );
    if (result.containsMissing && !mergedOptions.skipMissing) {
      return null;
    }
    if (result.count === 0) {
      return null;
    }
    return result.state;
  } else {
    const result = processSingleValue(variableOrValues, options, "max()");
    if (result.isMissing && !mergedOptions.skipMissing) {
      return null;
    }
    return result.isMissing ? null : result.value;
  }
};
function max(variableOrValues, options) {
  return {
    summarizeFunction: maxInternal,
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
const sdInternal = (dataCalc, params, options) => {
  const variableOrValues = params[0];
  if (typeof variableOrValues === "string") {
    if (!dataCalc.variableExists(variableOrValues)) {
      return null;
    }
    const varianceValue = varianceInternal(dataCalc, params, options);
    if (varianceValue === null) {
      return null;
    }
    return Math.sqrt(varianceValue);
  } else if (Array.isArray(variableOrValues)) {
    const newParams = [...params];
    const varianceValue = varianceInternal(dataCalc, newParams, options);
    if (varianceValue === null) {
      return null;
    }
    return Math.sqrt(varianceValue);
  } else {
    return null;
  }
};
function sd(variableOrValues, options) {
  return {
    summarizeFunction: sdInternal,
    parameters: [variableOrValues],
    options
  };
}

console.log("\u26AA @m2c2kit/data-calc version 0.8.2 (62ccf312)");

export { DataCalc, max, mean, median, min, n, sd, sum, variance };
//# sourceMappingURL=index.js.map
