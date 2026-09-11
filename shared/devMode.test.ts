import { describe, expect, it } from 'vitest';
import { isDevModeEnabled } from './devMode';

describe('developer fake-player mode gate', () => {
  it('requires both an explicit request and Firebase emulator mode', () => {
    expect(isDevModeEnabled({ emulatorMode: true, requested: true })).toBe(
      true,
    );
    expect(isDevModeEnabled({ emulatorMode: true, requested: false })).toBe(
      false,
    );
    expect(isDevModeEnabled({ emulatorMode: false, requested: true })).toBe(
      false,
    );
    expect(isDevModeEnabled({ emulatorMode: false, requested: false })).toBe(
      false,
    );
  });
});
