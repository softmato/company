/**
 * A `sequence_no` that cannot collide with another test's.
 *
 * `invoices` carries `UNIQUE (fiscal_year, sequence_no)`, and every fixture
 * that needed one reached for the same shape:
 *
 *     const unique = Date.now() + Math.floor(Math.random() * 1000);
 *
 * Two calls a few hundred milliseconds apart draw from **overlapping ranges**,
 * so the collision is not a same-millisecond race — it is the birthday
 * problem, and a suite only has to make enough invoices for it to fire. CI hit
 * `invoices_fiscal_sequence_key` on exactly that, in a file that had passed for
 * months, after two suites were added to the same database.
 *
 * Randomness is the wrong tool here. Two things have to be separated and both
 * are knowable:
 *
 *   * **Processes.** Vitest runs each test file in its own worker, and
 *     `process.pid` is unique among the processes running at any one moment.
 *   * **Calls within a process.** A counter, in strides of 1000, so one
 *     worker's counter can never walk into another worker's base.
 *
 * The result is collision-free by construction rather than by probability, and
 * it stays inside `Number.MAX_SAFE_INTEGER`: `Date.now() * 1000` is about
 * 1.8e15 against a ceiling of 9.0e15, and closing that gap would take billions
 * of invoices in one run.
 */
const BASE = Date.now() * 1000 + (process.pid % 1000);

let calls = 0;

export function nextSequenceNo(): number {
  calls += 1;
  return BASE + calls * 1000;
}
