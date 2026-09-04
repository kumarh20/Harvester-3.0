import { Injectable, signal } from '@angular/core';

export interface GeoPoint {
  lat: number;
  lng: number;
  timestamp?: number;
  accuracy?: number;
}

export interface SavedFieldMeasurement {
  id: string;
  name: string;
  date: string;
  acres: number;
  bigha: number;
  hectares: number;
  sqMeters: number;
  sqFeet: number;
  perimeterMeters: number;
  points: GeoPoint[];
  method: 'map' | 'walk';
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LandMeasurementService {
  private readonly STORAGE_KEY = 'harvester_saved_fields';

  // Saved field measurements signal
  savedFields = signal<SavedFieldMeasurement[]>([]);

  // Configurable Bigha ratio per Acre (Default North India: 1 Acre = 1.6 Bigha)
  bighaPerAcre = signal<number>(1.6);

  constructor() {
    this.loadSavedFields();
    const savedRatio = localStorage.getItem('harvester_bigha_ratio');
    if (savedRatio) {
      const parsed = parseFloat(savedRatio);
      if (!isNaN(parsed) && parsed > 0) {
        this.bighaPerAcre.set(parsed);
      }
    }
  }

  setBighaRatio(ratio: number): void {
    this.bighaPerAcre.set(ratio);
    localStorage.setItem('harvester_bigha_ratio', ratio.toString());
  }

  loadSavedFields(): void {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw) as SavedFieldMeasurement[];
        this.savedFields.set(Array.isArray(list) ? list : []);
      }
    } catch (e) {
      console.error('Failed to load saved field measurements:', e);
      this.savedFields.set([]);
    }
  }

  saveField(field: Omit<SavedFieldMeasurement, 'id' | 'date'>): SavedFieldMeasurement {
    const newField: SavedFieldMeasurement = {
      ...field,
      id: 'field_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      date: new Date().toISOString()
    };

    const updated = [newField, ...this.savedFields()];
    this.savedFields.set(updated);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist field measurement:', e);
    }
    return newField;
  }

  deleteField(id: string): void {
    const updated = this.savedFields().filter(f => f.id !== id);
    this.savedFields.set(updated);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to update saved fields after deletion:', e);
    }
  }

  /**
   * Calculates geodesic spherical polygon area in Square Meters using Girard's theorem / Karney's formula
   */
  calculatePolygonArea(points: GeoPoint[]): number {
    if (!points || points.length < 3) {
      return 0;
    }

    const earthRadius = 6378137; // WGS84 major radius in meters
    let totalArea = 0;

    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];

      const lat1 = (p1.lat * Math.PI) / 180;
      const lat2 = (p2.lat * Math.PI) / 180;
      const lngDiff = ((p2.lng - p1.lng) * Math.PI) / 180;

      // Spherical trapezoid area
      totalArea += lngDiff * (2 + Math.sin(lat1) + Math.sin(lat2));
    }

    totalArea = Math.abs((totalArea * earthRadius * earthRadius) / 4);
    return totalArea;
  }

  /**
   * Calculates total boundary perimeter in meters
   */
  calculatePerimeter(points: GeoPoint[], closed: boolean = true): number {
    if (!points || points.length < 2) return 0;
    let distance = 0;
    const n = points.length;
    const loopLimit = closed && n >= 3 ? n : n - 1;

    for (let i = 0; i < loopLimit; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      distance += this.haversineDistance(p1, p2);
    }

    return distance;
  }

  /**
   * Great circle distance between two points in meters
   */
  haversineDistance(p1: GeoPoint, p2: GeoPoint): number {
    const R = 6378137; // Earth's radius in meters
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Unit conversions
  toAcres(sqMeters: number): number {
    return sqMeters / 4046.8564224;
  }

  toBigha(sqMeters: number): number {
    const acres = this.toAcres(sqMeters);
    return acres * this.bighaPerAcre();
  }

  toHectares(sqMeters: number): number {
    return sqMeters / 10000;
  }

  toSqFeet(sqMeters: number): number {
    return sqMeters * 10.7639104;
  }

  toGuntha(sqMeters: number): number {
    // 1 Acre = 40 Guntha -> 1 Guntha = 101.1714 m²
    return sqMeters / 101.17141056;
  }

  formatAcres(acres: number): string {
    return acres < 10 ? acres.toFixed(2) : acres.toFixed(1);
  }
}
