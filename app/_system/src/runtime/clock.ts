/** The ONLY place wall-clock time enters the system. The core receives it inside RawInput.at. */
export const now = (): number => Date.now();
export const newId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
