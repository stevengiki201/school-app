/**
 * Stub heavy native/RN modules so the export logic can be tested in plain Node.
 * dayjs customParseFormat is REQUIRED for parsing "DD-MM-YYYY" strings — it is
 * normally loaded by app code, so tests must load it too.
 */
jest.mock("expo-print", () => ({ printToFileAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));
jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "/docs/",
  EncodingType: { UTF8: "utf8" },
  getInfoAsync: jest.fn(async () => ({ exists: false })),
  makeDirectoryAsync: jest.fn(async () => undefined),
  writeAsStringAsync: jest.fn(async () => undefined),
}));
jest.mock("react-native", () => ({ Platform: { OS: "web" }, Alert: { alert: jest.fn() } }));

// alertMessage() uses window.alert on web; Node has no window.
(globalThis as any).window = { alert: jest.fn(), confirm: jest.fn(() => true) };
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
}));

import { extend } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
extend(customParseFormat);
