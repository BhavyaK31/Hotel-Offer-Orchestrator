import axios from "axios";
import { HotelOffer, SupplierHotel } from "./types";
import { saveOffers } from "./redis";

const baseUrl = process.env.SUPPLIER_BASE_URL ?? "http://localhost:3000";

async function fetchSupplier(path: string): Promise<SupplierHotel[]> {
  const response = await axios.get<SupplierHotel[]>(`${baseUrl}${path}`, { timeout: 5000 });
  return response.data;
}

export async function fetchSupplierA(city: string): Promise<SupplierHotel[]> {
  return fetchSupplier(`/supplierA/hotels?city=${encodeURIComponent(city)}`);
}

export async function fetchSupplierB(city: string): Promise<SupplierHotel[]> {
  return fetchSupplier(`/supplierB/hotels?city=${encodeURIComponent(city)}`);
}

export async function cacheOffers(city: string, offers: HotelOffer[]): Promise<void> {
  await saveOffers(city, offers);
}

export async function checkSupplierA(): Promise<boolean> {
  try {
    await axios.get(`${baseUrl}/supplierA/hotels?city=delhi`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function checkSupplierB(): Promise<boolean> {
  try {
    await axios.get(`${baseUrl}/supplierB/hotels?city=delhi`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
