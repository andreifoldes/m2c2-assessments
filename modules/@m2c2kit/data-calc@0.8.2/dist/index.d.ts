interface DataCalcOptions {
    groups?: Array<string>;
}

type DataValue = string | number | boolean | object | undefined | null;

/**
 * Key-value pairs where the key is the name of the new variable, and the value
 * is a function that mutates the data.
 */
interface Mutations {
    /**
     * We use "any" here because we do not know the type of the value of the
     * key-value pair.
     */
    [newVariable: string]: (observation: {
        [key: string]: any;
    }) => string | number | boolean | object | undefined | null;
}

/**
 * A set of key-value pairs conceptually similar to a row in
 * a dataset, where the keys are the variable names and the values are the
 * variable values.
 *
 * @remarks Originally, the types of the values were:
 * `string | number | boolean | object | undefined | null`,
 * but this caused type warnings in the use of filter functions, which would
 * be annoying for users of the library.
 */
type Observation = {
    [key: string]: any;
};

interface SummarizeOptions {
    /** Coerce boolean values to numbers? (false values become 0, true values become 1). Default is true. */
    coerceBooleans?: boolean;
    /** Skip missing values (NaN, infinite, null, or undefined) when calculating the summary? Default is false, and missing values will cause summarize operation to result in null. */
    skipMissing?: boolean;
}

/**
 * A function that internally executes the summarize operation.
 */
type SummarizeFunction = (dataCalc: DataCalc, params: Array<DataValue>, options?: SummarizeOptions) => DataValue;

/**
 * An operation that summarizes data.
 */
interface SummarizeOperation {
    summarizeFunction: SummarizeFunction;
    parameters: Array<DataValue>;
    options?: SummarizeOptions;
}

declare class DataCalc {
    private _observations;
    private _groups;
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
    constructor(data: Array<Observation>, options?: DataCalcOptions);
    /**
     * Returns the groups in the data.
     */
    get groups(): string[];
    /**
     * Returns the observations in the data.
     *
     * @remarks An observation is conceptually similar to a row in a dataset,
     * where the keys are the variable names and the values are the variable values.
     */
    get observations(): Observation[];
    /**
     * Alias for the observations property.
     */
    get rows(): Observation[];
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
    pull(variable: string): DataValue | DataValue[];
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
    get length(): number;
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
    filter(predicate: (observation: Observation) => boolean): DataCalc;
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
    groupBy(...groups: Array<string>): DataCalc;
    /**
     * Ungroups observations.
     *
     * @returns A new DataCalc object with the observations ungrouped
     */
    ungroup(): DataCalc;
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
    mutate(mutations: Mutations): DataCalc;
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
    summarize(summarizations: {
        [newVariable: string]: SummarizeOperation | DataValue;
    }): DataCalc;
    private summarizeByGroups;
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
    select(...variables: string[]): DataCalc;
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
    arrange(...variables: string[]): DataCalc;
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
    distinct(): DataCalc;
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
    rename(renames: {
        [newName: string]: string;
    }): DataCalc;
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
    innerJoin(other: DataCalc, by: string[]): DataCalc;
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
    leftJoin(other: DataCalc, by: string[]): DataCalc;
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
    rightJoin(other: DataCalc, by: string[]): DataCalc;
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
    fullJoin(other: DataCalc, by: string[]): DataCalc;
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
    slice(start: number, end?: number): DataCalc;
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
    bindRows(other: DataCalc): DataCalc;
    /**
     * Helper method to determine the primary type of a variable across observations
     * @internal
     *
     * @param variable - The variable name to check
     * @returns The most common type for the variable or 'mixed' if no clear type exists
     */
    private getVariableType;
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
    verifyObservationsContainVariable(variable: string): void;
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
    variableExists(variable: string): boolean;
    /**
     * Checks if a value is a non-missing numeric value.
     *
     * @remarks A non-missing numeric value is a value that is a number and is
     * not NaN or infinite.
     *
     * @param value - The value to check
     * @returns true if the value is a non-missing numeric value, false otherwise
     */
    isNonMissingNumeric(value: DataValue): boolean;
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
    isMissingNumeric(value: DataValue): boolean;
    /**
     * Normalizes an object for stable comparison by sorting keys
     * @internal
     *
     * @remarks Normalizing is needed to handle situations where objects have the
     * same properties but in different orders because we are using
     * JSON.stringify() for comparison.
     */
    private normalizeForComparison;
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
    private deepCopy;
    /**
     * Checks if an observation has null or undefined values in any of the join columns.
     * @internal
     *
     * @param obs - The observation to check
     * @param keys - The join columns to check
     * @returns true if any join column has a null or undefined value
     */
    private hasNullJoinKeys;
}

/**
 * Calculates the number of observations.
 *
 * @returns summarize operation calculating the number of observations
 *
 * @example
 * ```js
 * const d = [
 *   { a: 1, b: 2, c: 3 },
 *   { a: 0, b: 8, c: 3 },
 *   { a: 9, b: 4, c: 7 },
 * ];
 * const dc = new DataCalc(d);
 * console.log(
 *   dc.summarize({
 *     count: n()
 *   }).observations
 * );
 * // [ { count: 3 } ]
 * ```
 */
declare function n(): SummarizeOperation;
/**
 * Calculates the sum of a variable, value, or array of values
 *
 * @param variableOrValues - name of variable, or alternatively, a value or
 * array of values
 * @param options - options for handling missing values and boolean coercion
 * @returns summarize operation calculating the sum
 *
 * @example
 * ```js
 * const d = [
 *   { a: 1, b: 2, c: 3 },
 *   { a: 0, b: 8, c: 3 },
 *   { a: 9, b: 4, c: 7 },
 * ];
 * const dc = new DataCalc(d);
 * console.log(
 *   dc.summarize({
 *     totalB: sum("b")
 *   }).observations
 * );
 * // [ { totalB: 14 } ]
 * ```
 */
declare function sum(variableOrValues: string | DataValue | DataValue[], options?: SummarizeOptions): SummarizeOperation;
/**
 * Calculates the mean of a variable, value, or array of values
 *
 * @param variableOrValues - name of variable, or alternatively, a value or
 * array of values
 * @param options - options for handling missing values and boolean coercion
 * @returns summarize operation calculating the mean
 *
 * @example
 * ```js
 * const d = [
 *   { a: 1, b: 2, c: 3 },
 *   { a: 0, b: 8, c: 3 },
 *   { a: 9, b: 4, c: 7 },
 * ];
 * const dc = new DataCalc(d);
 * console.log(
 *   dc.summarize({
 *     meanA: mean("a")
 *   }).observations
 * );
 * // [ { meanA: 3.3333333333333335 } ]
 * ```
 */
declare function mean(variableOrValues: string | DataValue | DataValue[], options?: SummarizeOptions): SummarizeOperation;
/**
 * Calculates the variance of a variable, value, or array of values
 *
 * @param variableOrValues - name of variable, or alternatively, a value or
 * array of values
 * @param options - options for handling missing values and boolean coercion
 * @returns summarize operation calculating the variance
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
 *     varA: variance("a")
 *   }).observations
 * );
 * // [ { varA: 16.916666666666668 } ]
 * ```
 */
declare function variance(variableOrValues: string | DataValue | DataValue[], options?: SummarizeOptions): SummarizeOperation;
/**
 * Calculates the minimum value of a variable, value, or array of values
 *
 * @param variableOrValues - name of variable, or alternatively, a value or
 * array of values
 * @param options - options for handling missing values and boolean coercion
 * @returns summarize operation calculating the minimum
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
 *     minA: min("a")
 *   }).observations
 * );
 * // [ { minA: 0 } ]
 * ```
 */
declare function min(variableOrValues: string | DataValue | DataValue[], options?: SummarizeOptions): SummarizeOperation;
/**
 * Calculates the maximum value of a variable, value, or array of values
 *
 * @param variableOrValues - name of variable, or alternatively, a value or
 * array of values
 * @param options - options for handling missing values and boolean coercion
 * @returns summarize operation calculating the maximum
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
 *     maxA: max("a")
 *   }).observations
 * );
 * // [ { maxA: 9 } ]
 * ```
 */
declare function max(variableOrValues: string | DataValue | DataValue[], options?: SummarizeOptions): SummarizeOperation;
/**
 * Calculates the median value of a variable, value, or array of values
 *
 * @param variableOrValues - name of variable, or alternatively, a value or
 * array of values
 * @param options - options for handling missing values and boolean coercion
 * @returns summarize operation calculating the median
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
 *     medA: median("a")
 *   }).observations
 * );
 * // [ { medA: 3 } ]
 * ```
 */
declare function median(variableOrValues: string | DataValue | DataValue[], options?: SummarizeOptions): SummarizeOperation;
/**
 * Calculates the standard deviation of a variable, value, or array of values
 *
 * @param variableOrValues - name of variable, or alternatively, a value or
 * array of values
 * @param options - options for handling missing values and boolean coercion
 * @returns summarize operation calculating the standard deviation
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
 *     sdA: sd("a")
 *   }).observations
 * );
 * // [ { sdA: 4.112987559751022 } ]
 * ```
 */
declare function sd(variableOrValues: string | DataValue | DataValue[], options?: SummarizeOptions): SummarizeOperation;

export { DataCalc, max, mean, median, min, n, sd, sum, variance };
export type { DataCalcOptions, DataValue, Mutations, Observation, SummarizeFunction, SummarizeOperation, SummarizeOptions };
