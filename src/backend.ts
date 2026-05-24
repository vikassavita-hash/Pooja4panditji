export async function apiGet<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(endpoint, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) {
      console.error(`Backend GET failed for ${endpoint}:`, res.statusText);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`Backend GET error for ${endpoint}:`, error);
    return null;
  }
}

export async function apiPost<T, R>(endpoint: string, body: T): Promise<R | null> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`Backend POST failed for ${endpoint}:`, res.statusText);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.error(`Backend POST error for ${endpoint}:`, error);
    return null;
  }
}

export function getSettings() {
  return apiGet('/api/settings');
}

export function saveSettings(settings: unknown) {
  return apiPost('/api/settings', settings);
}

export function getPujas() {
  return apiGet('/api/pujas');
}

export function savePujas(pujas: unknown) {
  return apiPost('/api/pujas', pujas);
}

export function getUsers() {
  return apiGet('/api/users');
}

export function saveUsers(users: unknown) {
  return apiPost('/api/users', users);
}

export function getBookings() {
  return apiGet('/api/bookings');
}

export function saveBookings(bookings: unknown) {
  return apiPost('/api/bookings', bookings);
}
