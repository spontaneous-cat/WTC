export function isDevModeEnabled({
  emulatorMode,
  requested,
}: {
  emulatorMode: boolean;
  requested: boolean;
}) {
  return emulatorMode && requested;
}
