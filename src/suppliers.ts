import { SupplierHotel } from "./types";

const supplierA: SupplierHotel[] = [
  { hotelId: "a1", name: "Holtin", price: 6000, city: "delhi", commissionPct: 10, supplier: "Supplier A" },
  { hotelId: "a2", name: "Radison", price: 5900, city: "delhi", commissionPct: 13, supplier: "Supplier A" },
  { hotelId: "a3", name: "The Grand", price: 7200, city: "delhi", commissionPct: 15, supplier: "Supplier A" },
  { hotelId: "a4", name: "City View", price: 4100, city: "mumbai", commissionPct: 11, supplier: "Supplier A" }
];

const supplierB: SupplierHotel[] = [
  { hotelId: "b1", name: "Holtin", price: 5340, city: "delhi", commissionPct: 20, supplier: "Supplier B" },
  { hotelId: "b2", name: "Radison", price: 6200, city: "delhi", commissionPct: 9, supplier: "Supplier B" },
  { hotelId: "b3", name: "Park Plaza", price: 6800, city: "delhi", commissionPct: 12, supplier: "Supplier B" },
  { hotelId: "b4", name: "Harbour Inn", price: 3900, city: "mumbai", commissionPct: 14, supplier: "Supplier B" }
];

export function getSupplierA(city: string): SupplierHotel[] {
  return supplierA.filter((hotel) => hotel.city === city.toLowerCase());
}

export function getSupplierB(city: string): SupplierHotel[] {
  return supplierB.filter((hotel) => hotel.city === city.toLowerCase());
}
