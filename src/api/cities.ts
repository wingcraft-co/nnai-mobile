import { apiRequest } from './client';

import type { City, Pin } from '@/types/api';

export const fetchCities = (): Promise<City[]> => apiRequest('/api/mobile/cities');
export const fetchCity = (cityId: string): Promise<City> => apiRequest(`/api/mobile/cities/${cityId}`);
export const fetchPins = (): Promise<Pin[]> => apiRequest('/api/mobile/pins');
export const createPin = (data: {
  city: string;
  display: string;
  note: string;
  lat: number;
  lng: number;
}): Promise<Pin> =>
  apiRequest('/api/mobile/pins', { method: 'POST', body: JSON.stringify(data) });
