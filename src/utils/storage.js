import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'atm_token';
const USER_KEY  = 'atm_user';

export async function saveToken(token) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function removeToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function saveUser(user) {
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function getUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function removeUser() {
  await AsyncStorage.removeItem(USER_KEY);
}

export async function clearAll() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
