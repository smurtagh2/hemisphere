import { describe, it, expect } from 'vitest';
import { assertNever } from '../utils';

describe('assertNever', () => {
  it('throws an error with the unexpected value when called', () => {
    // assertNever is designed to be unreachable at runtime in type-safe code.
    // We call it via a cast to test the runtime behaviour.
    expect(() => assertNever('unexpected-value' as never)).toThrow(
      'Unexpected value: unexpected-value'
    );
  });

  it('includes the value in the error message', () => {
    try {
      assertNever(42 as never);
    } catch (e) {
      expect((e as Error).message).toContain('42');
    }
  });
});
