/**
 * Register the dayjs plugins the app relies on.
 *
 * CRITICAL: parsing "DD-MM-YYYY" strings (attendance dates, export ranges)
 * requires the customParseFormat plugin. Without it dayjs falls back to its
 * native Date parser, which mis-parses DD-MM-YYYY (wrong date on web/Chrome,
 * Invalid Date on Hermes) — making saved attendance look "not in range" and
 * breaking exports and the saved-rollcall listings.
 */
import { extend } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

let registered = false;

export function ensureDayjsPlugins() {
  if (registered) return;
  extend(customParseFormat);
  registered = true;
}

// Apply immediately on import so every module that imports this file is safe.
ensureDayjsPlugins();
