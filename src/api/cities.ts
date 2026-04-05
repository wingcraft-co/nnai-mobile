import { apiRequest } from './client';

import type { City, CityStay, Pin } from '@/types/api';

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

export const fetchCityStays = (): Promise<CityStay[]> =>
  apiRequest('/api/mobile/city-stays');

export const createCityStay = (data: {
  city: string;
  country?: string | null;
  arrived_at: string;
  visa_expires_at?: string | null;
  budget_total?: number | null;
  budget_remaining?: number | null;
}): Promise<CityStay> =>
  apiRequest('/api/mobile/city-stays', { method: 'POST', body: JSON.stringify(data) });

export const patchCityStay = (
  id: number,
  data: Partial<Pick<CityStay, 'city' | 'country' | 'arrived_at' | 'visa_expires_at' | 'budget_total' | 'budget_remaining'>>,
): Promise<CityStay> =>
  apiRequest(`/api/mobile/city-stays/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const leaveCityStay = (id: number): Promise<CityStay> =>
  apiRequest(`/api/mobile/city-stays/${id}/leave`, { method: 'POST' });
