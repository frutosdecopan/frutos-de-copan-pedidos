import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// @testing-library/react doesn't auto-unmount between tests unless
// `test.globals: true` is set — clean up explicitly instead, so one test's
// rendered DOM (and component state) can't leak into the next.
afterEach(() => {
    cleanup();
});
