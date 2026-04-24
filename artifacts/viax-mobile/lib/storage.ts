import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  serverUrl: "@viax/serverUrl",
  cookies: "@viax/cookies",
  user: "@viax/user",
  theme: "@viax/theme",
  recents: "@viax/recents",
} as const;

export async function get(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function set(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}

export async function remove(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}
