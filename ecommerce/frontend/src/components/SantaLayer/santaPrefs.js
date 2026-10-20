// Per-visitor Santa preferences (minimised, sound). Browser storage can be unavailable (private
// mode, blocked site data), so every access is guarded and falls back to the defaults.
const KEY = "raave-santa";
const DEFAULTS = { minimised: false, sound: false };

export const loadPrefs = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { ...DEFAULTS };
  }
};

export const savePrefs = (prefs) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Not persisted; the choice still applies for this visit.
  }
};
