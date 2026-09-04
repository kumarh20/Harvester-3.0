import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
  computed,
  Inject,
  Optional,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { LandMeasurementService, GeoPoint, SavedFieldMeasurement } from '../../core/services/land-measurement.service';
import { ToastService } from '../../shared/services/toast.service';
import { TranslationService } from '../../shared/services/translation.service';

export interface LandMeasurementDialogData {
  isDialog?: boolean;
  initialAcres?: number;
}

@Component({
  selector: 'app-land-measurement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatDialogModule
  ],
  templateUrl: './land-measurement.component.html',
  styleUrl: './land-measurement.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class LandMeasurementComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  isDialogMode = false;

  // Active measurement mode: 'map' (Tap points) vs 'walk' (Live GPS walk)
  measureMode = signal<'map' | 'walk'>('map');

  // Map layer type: 'satellite' vs 'street'
  mapLayerType = signal<'satellite' | 'street'>('satellite');

  // Measured points
  points = signal<GeoPoint[]>([]);

  // Walk Tracking State
  isWalking = signal<boolean>(false);
  isWalkPaused = signal<boolean>(false);
  gpsAccuracy = signal<number | null>(null);
  gpsStatus = signal<'waiting' | 'excellent' | 'good' | 'weak' | 'error'>('waiting');
  walkDistance = signal<number>(0); // in meters
  walkStartTime = signal<number | null>(null);
  walkElapsedTime = signal<string>('00:00');

  // Regional Bigha unit setting
  bighaRatio = signal<number>(1.6); // Default 1.6 Bigha/Acre (standard north/central India)

  // Saved Fields Drawer / Modal
  showSavedFields = signal<boolean>(false);
  newFieldName = signal<string>('');
  showSaveDialog = signal<boolean>(false);

  // Live Calculations
  calculatedSqMeters = computed(() => {
    return this.landService.calculatePolygonArea(this.points());
  });

  calculatedAcres = computed(() => {
    return this.landService.toAcres(this.calculatedSqMeters());
  });

  calculatedBigha = computed(() => {
    const acres = this.calculatedAcres();
    return acres * this.bighaRatio();
  });

  calculatedHectares = computed(() => {
    return this.landService.toHectares(this.calculatedSqMeters());
  });

  calculatedSqFeet = computed(() => {
    return this.landService.toSqFeet(this.calculatedSqMeters());
  });

  calculatedPerimeterMeters = computed(() => {
    return this.landService.calculatePerimeter(this.points(), true);
  });

  calculatedPerimeterFeet = computed(() => {
    return this.calculatedPerimeterMeters() * 3.28084;
  });

  // Leaflet Map & Layer References
  private map: L.Map | null = null;
  private satelliteLayer: L.TileLayer | null = null;
  private streetLayer: L.TileLayer | null = null;
  private polygonLayer: L.Polygon | null = null;
  private polylineLayer: L.Polyline | null = null;
  private markersGroup: L.LayerGroup | null = null;
  private liveGpsMarker: L.Marker | null = null;
  private accuracyCircle: L.Circle | null = null;

  // Geolocation watch ID & walk timer
  private geoWatchId: number | null = null;
  private walkTimerInterval: any = null;

  constructor(
    public landService: LandMeasurementService,
    private toastService: ToastService,
    public translationService: TranslationService,
    private router: Router,
    @Optional() public dialogRef: MatDialogRef<LandMeasurementComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public dialogData: LandMeasurementDialogData | null
  ) {
    if (this.dialogData && this.dialogData.isDialog) {
      this.isDialogMode = true;
    }
    this.bighaRatio.set(this.landService.bighaPerAcre());
  }

  ngOnInit(): void {
    // Check geolocation permission / support
    if (!('geolocation' in navigator)) {
      this.gpsStatus.set('error');
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 250);
  }

  ngOnDestroy(): void {
    this.stopGpsWatch();
    if (this.walkTimerInterval) {
      clearInterval(this.walkTimerInterval);
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // ==========================================
  // MAP INITIALIZATION
  // ==========================================
  private initMap(): void {
    if (!this.mapContainer?.nativeElement || this.map) return;

    // Default center: India central coordinates (or user location if available)
    const defaultLat = 22.9734;
    const defaultLng = 78.6569;
    const defaultZoom = 5;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false
    });

    // Add zoom control in top right
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    // High-Resolution Esri World Imagery (Satellite)
    this.satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Esri Satellite'
      }
    );

    // OpenStreetMap Standard (Street)
    this.streetLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: 'OpenStreetMap'
      }
    );

    // Default to Satellite
    if (this.mapLayerType() === 'satellite') {
      this.satelliteLayer.addTo(this.map);
    } else {
      this.streetLayer.addTo(this.map);
    }

    this.markersGroup = L.layerGroup().addTo(this.map);

    // Click handler for Map Points Mode
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.measureMode() === 'map') {
        this.addPoint(e.latlng.lat, e.latlng.lng);
      }
    });

    // Trigger initial location check to center near user's farm
    this.locateUser(false);

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 400);
  }

  // Switch between Satellite and Street View
  setMapLayer(type: 'satellite' | 'street'): void {
    if (!this.map) return;
    this.mapLayerType.set(type);

    if (type === 'satellite') {
      if (this.streetLayer && this.map.hasLayer(this.streetLayer)) {
        this.map.removeLayer(this.streetLayer);
      }
      this.satelliteLayer?.addTo(this.map);
    } else {
      if (this.satelliteLayer && this.map.hasLayer(this.satelliteLayer)) {
        this.map.removeLayer(this.satelliteLayer);
      }
      this.streetLayer?.addTo(this.map);
    }
  }

  // Switch between Map Point and Walk Mode
  setMode(mode: 'map' | 'walk'): void {
    if (this.isWalking()) {
      this.toastService.info('Please pause or finish your walk before changing mode.');
      return;
    }
    this.measureMode.set(mode);
    if (mode === 'walk') {
      this.locateUser(true);
    }
  }

  // Center to user GPS location
  locateUser(zoomIn: boolean = true): void {
    if (!('geolocation' in navigator) || !this.map) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        this.gpsAccuracy.set(Math.round(acc));

        this.updateGpsStatus(acc);

        if (this.map) {
          const zoom = zoomIn ? 18 : Math.max(this.map.getZoom(), 16);
          this.map.setView([lat, lng], zoom);
          this.renderLiveGpsDot(lat, lng, acc);
        }
      },
      (err) => {
        console.warn('Location detection note:', err.message);
        if (zoomIn) {
          this.toastService.info('Could not detect GPS location. Please check device permissions.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }

  private updateGpsStatus(acc: number): void {
    if (acc <= 5) {
      this.gpsStatus.set('excellent');
    } else if (acc <= 12) {
      this.gpsStatus.set('good');
    } else {
      this.gpsStatus.set('weak');
    }
  }

  private renderLiveGpsDot(lat: number, lng: number, accuracy: number): void {
    if (!this.map) return;

    const iconHtml = `<div class="live-gps-radar-pin"><div class="radar-pulse"></div><div class="radar-dot"></div></div>`;
    const liveIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-live-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (this.liveGpsMarker) {
      this.liveGpsMarker.setLatLng([lat, lng]);
    } else {
      this.liveGpsMarker = L.marker([lat, lng], { icon: liveIcon, zIndexOffset: 1000 }).addTo(this.map);
    }

    if (this.accuracyCircle) {
      this.accuracyCircle.setLatLng([lat, lng]);
      this.accuracyCircle.setRadius(accuracy);
    } else {
      this.accuracyCircle = L.circle([lat, lng], {
        radius: accuracy,
        color: '#0284C7',
        fillColor: '#0284C7',
        fillOpacity: 0.12,
        weight: 1
      }).addTo(this.map);
    }
  }

  // ==========================================
  // MODE 1: MAP POINT INTERACTION
  // ==========================================
  addPoint(lat: number, lng: number): void {
    const current = [...this.points()];
    current.push({ lat, lng, timestamp: Date.now() });
    this.points.set(current);
    this.renderMapElements();
  }

  undoLastPoint(): void {
    const current = [...this.points()];
    if (current.length === 0) return;
    current.pop();
    this.points.set(current);
    this.renderMapElements();
  }

  clearAllPoints(): void {
    this.points.set([]);
    if (this.polygonLayer && this.map) {
      this.map.removeLayer(this.polygonLayer);
      this.polygonLayer = null;
    }
    if (this.polylineLayer && this.map) {
      this.map.removeLayer(this.polylineLayer);
      this.polylineLayer = null;
    }
    this.markersGroup?.clearLayers();
    this.walkDistance.set(0);
  }

  private renderMapElements(): void {
    if (!this.map || !this.markersGroup) return;

    this.markersGroup.clearLayers();
    const pts = this.points();
    const latLngs = pts.map(p => L.latLng(p.lat, p.lng));

    // Render numbered markers for each boundary point
    pts.forEach((p, idx) => {
      const isFirst = idx === 0;
      const markerHtml = `
        <div class="field-point-pin ${isFirst ? 'pin-start' : ''}">
          <span>${idx + 1}</span>
        </div>
      `;
      const customIcon = L.divIcon({
        html: markerHtml,
        className: 'field-point-wrapper',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([p.lat, p.lng], {
        icon: customIcon,
        draggable: this.measureMode() === 'map' // Only draggable in map mode
      });

      // Point drag handler for fine-tuning corners
      marker.on('dragend', (event: any) => {
        const newPos = event.target.getLatLng();
        const updated = [...this.points()];
        updated[idx] = { ...updated[idx], lat: newPos.lat, lng: newPos.lng };
        this.points.set(updated);
        this.renderMapElements();
      });

      this.markersGroup?.addLayer(marker);
    });

    // If < 3 points, draw connecting line
    if (pts.length < 3) {
      if (this.polygonLayer && this.map.hasLayer(this.polygonLayer)) {
        this.map.removeLayer(this.polygonLayer);
        this.polygonLayer = null;
      }

      if (pts.length >= 2) {
        if (!this.polylineLayer) {
          this.polylineLayer = L.polyline(latLngs, {
            color: '#10B981',
            weight: 3.5,
            dashArray: '6, 6'
          }).addTo(this.map);
        } else {
          this.polylineLayer.setLatLngs(latLngs);
        }
      } else if (this.polylineLayer && this.map.hasLayer(this.polylineLayer)) {
        this.map.removeLayer(this.polylineLayer);
        this.polylineLayer = null;
      }
      return;
    }

    // >= 3 points: Render closed polygon
    if (this.polylineLayer && this.map.hasLayer(this.polylineLayer)) {
      this.map.removeLayer(this.polylineLayer);
      this.polylineLayer = null;
    }

    if (!this.polygonLayer) {
      this.polygonLayer = L.polygon(latLngs, {
        color: '#059669',
        weight: 3.5,
        fillColor: '#10B981',
        fillOpacity: 0.35
      }).addTo(this.map);
    } else {
      this.polygonLayer.setLatLngs(latLngs);
    }
  }

  // ==========================================
  // MODE 2: WALK TRACKING (GPS Boundary Walking)
  // ==========================================
  startWalk(): void {
    if (!('geolocation' in navigator)) {
      this.toastService.error('GPS Geolocation is not supported by your browser.');
      return;
    }

    this.isWalking.set(true);
    this.isWalkPaused.set(false);
    this.walkStartTime.set(Date.now());
    this.walkDistance.set(0);
    this.clearAllPoints();

    // Start elapsed timer
    this.startWalkTimer();

    // Start High-Accuracy Geolocation Watch
    this.geoWatchId = navigator.geolocation.watchPosition(
      (pos) => this.onWalkGpsUpdate(pos),
      (err) => {
        console.error('Walk GPS Error:', err);
        this.toastService.error('GPS error: ' + err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 15000
      }
    );

    this.toastService.success('Walk tracking started! Walk steadily along the boundary of the field.');
  }

  pauseWalk(): void {
    this.isWalkPaused.set(true);
    this.stopGpsWatch();
    this.toastService.info('Walk tracking paused.');
  }

  resumeWalk(): void {
    this.isWalkPaused.set(false);
    this.geoWatchId = navigator.geolocation.watchPosition(
      (pos) => this.onWalkGpsUpdate(pos),
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
    this.toastService.success('Walk tracking resumed.');
  }

  finishWalk(): void {
    this.isWalking.set(false);
    this.isWalkPaused.set(false);
    this.stopGpsWatch();
    if (this.walkTimerInterval) {
      clearInterval(this.walkTimerInterval);
    }

    const pts = this.points();
    if (pts.length < 3) {
      this.toastService.info('Field requires at least 3 corner points to calculate area.');
      return;
    }

    this.renderMapElements();
    this.toastService.success(`Measurement complete! Area: ${this.calculatedAcres().toFixed(2)} Acres`);
  }

  // Add current position manually (useful for marking exact field corners)
  addCurrentWalkCorner(): void {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.addPoint(lat, lng);
        this.renderLiveGpsDot(lat, lng, pos.coords.accuracy);
        this.toastService.success(`Corner #${this.points().length} marked!`);
      },
      (err) => {
        this.toastService.error('Could not get GPS fix.');
      },
      { enableHighAccuracy: true }
    );
  }

  private onWalkGpsUpdate(pos: GeolocationPosition): void {
    if (this.isWalkPaused()) return;

    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy;

    this.gpsAccuracy.set(Math.round(acc));
    this.updateGpsStatus(acc);
    this.renderLiveGpsDot(lat, lng, acc);

    // Center map on user while walking
    if (this.map) {
      this.map.panTo([lat, lng]);
    }

    const currentPts = this.points();
    if (currentPts.length === 0) {
      // First point
      this.addPoint(lat, lng);
      return;
    }

    // Distance filter: only add point if user walked at least 2.5 meters from last point
    const lastPt = currentPts[currentPts.length - 1];
    const dist = this.landService.haversineDistance(lastPt, { lat, lng });

    if (dist >= 2.5) {
      this.addPoint(lat, lng);
      this.walkDistance.update(d => d + dist);
    }
  }

  private stopGpsWatch(): void {
    if (this.geoWatchId !== null) {
      navigator.geolocation.clearWatch(this.geoWatchId);
      this.geoWatchId = null;
    }
  }

  private startWalkTimer(): void {
    if (this.walkTimerInterval) clearInterval(this.walkTimerInterval);
    const start = Date.now();
    this.walkTimerInterval = setInterval(() => {
      if (this.isWalkPaused()) return;
      const elapsedSec = Math.floor((Date.now() - start) / 1000);
      const m = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
      const s = (elapsedSec % 60).toString().padStart(2, '0');
      this.walkElapsedTime.set(`${m}:${s}`);
    }, 1000);
  }

  // ==========================================
  // REGIONAL RATIO & ACTIONS
  // ==========================================
  setRegionalBigha(ratio: number): void {
    this.bighaRatio.set(ratio);
    this.landService.setBighaRatio(ratio);
    this.toastService.info(`Bigha unit set to ${ratio} Bigha / Acre.`);
  }

  // Apply to Add-New Form when opened as dialog
  applyToForm(): void {
    const acres = Number(this.calculatedAcres().toFixed(2));
    if (acres <= 0) {
      this.toastService.info('Please mark at least 3 points on field boundary.');
      return;
    }

    if (this.dialogRef) {
      this.dialogRef.close({
        acres,
        bigha: Number(this.calculatedBigha().toFixed(2)),
        perimeterMeters: Math.round(this.calculatedPerimeterMeters())
      });
    }
  }

  // Standalone: Create new cutting record
  createCuttingRecord(): void {
    const acres = Number(this.calculatedAcres().toFixed(2));
    if (acres <= 0) {
      this.toastService.info('Please mark field boundaries first.');
      return;
    }
    // Navigate to /add-new with query params
    this.router.navigate(['/add-new'], { queryParams: { acres } });
  }

  // Save field to local measurement ledger
  promptSaveField(): void {
    if (this.points().length < 3) {
      this.toastService.info('Please measure a field before saving.');
      return;
    }
    this.newFieldName.set(`Field Plot ${this.landService.savedFields().length + 1}`);
    this.showSaveDialog.set(true);
  }

  confirmSaveField(): void {
    const name = this.newFieldName().trim() || 'Harvest Field';
    this.landService.saveField({
      name,
      acres: Number(this.calculatedAcres().toFixed(2)),
      bigha: Number(this.calculatedBigha().toFixed(2)),
      hectares: Number(this.calculatedHectares().toFixed(3)),
      sqMeters: Math.round(this.calculatedSqMeters()),
      sqFeet: Math.round(this.calculatedSqFeet()),
      perimeterMeters: Math.round(this.calculatedPerimeterMeters()),
      points: this.points(),
      method: this.measureMode()
    });

    this.showSaveDialog.set(false);
    this.toastService.success(`Field "${name}" saved to your field records!`);
  }

  // Load a saved field onto the map
  loadSavedField(field: SavedFieldMeasurement): void {
    this.clearAllPoints();
    this.points.set(field.points);
    this.renderMapElements();

    if (this.map && field.points.length > 0) {
      const bounds = L.latLngBounds(field.points.map(p => [p.lat, p.lng]));
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
    this.showSavedFields.set(false);
    this.toastService.info(`Loaded field "${field.name}".`);
  }

  deleteSavedField(id: string, e: Event): void {
    e.stopPropagation();
    this.landService.deleteField(id);
    this.toastService.info('Field removed.');
  }

  // Share field report via WhatsApp or clipboard
  shareField(): void {
    const acres = this.calculatedAcres().toFixed(2);
    const bigha = this.calculatedBigha().toFixed(2);
    const perimeter = Math.round(this.calculatedPerimeterMeters());
    const sqM = Math.round(this.calculatedSqMeters()).toLocaleString();

    const text = `🌾 *Harvester Land Area Report* 🌾\n` +
      `📐 Area: *${acres} Acres* (${bigha} Bigha)\n` +
      `📏 Perimeter: *${perimeter} Meters*\n` +
      `📊 Square Meters: *${sqM} m²*\n` +
      `Measured via Harvester Cutting Tracker`;

    if (navigator.share) {
      navigator.share({ title: 'Field Measurement', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      this.toastService.success('Field report copied to clipboard!');
    }
  }

  closeDialog(): void {
    if (this.dialogRef) {
      this.dialogRef.close(null);
    }
  }
}
