/**
 * One-shot "edit this test" requests from test-score to add-test.
 *
 * Why not route params? The (classes) drawer keeps `add-test` mounted, so an
 * `editTestId` param set on the first Edit keeps applying to every later
 * visit — a new "Add Test Scores" would silently re-edit the old test. This
 * bus carries a monotonically increasing `seq` so each Edit request is applied
 * exactly once, and the form returns to "add new test" mode when cleared.
 */

export interface TestEditRequest {
  testId: string;
  seq: number;
}

let current: TestEditRequest | null = null;
const listeners = new Set<(r: TestEditRequest | null) => void>();

/** Ask the Add Test screen to load `testId` for editing. */
export function requestTestEdit(testId: string) {
  current = { testId, seq: (current?.seq ?? 0) + 1 };
  listeners.forEach((l) => l(current));
}

/** Leave edit mode: the Add Test screen goes back to creating a new test. */
export function clearTestEditRequest() {
  current = null;
  listeners.forEach((l) => l(null));
}

/** Subscribe to requests. Returns an unsubscribe function. */
export function subscribeTestEditRequest(
  listener: (r: TestEditRequest | null) => void
) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current pending request, if any (for initial state on mount). */
export function getCurrentTestEditRequest(): TestEditRequest | null {
  return current;
}
