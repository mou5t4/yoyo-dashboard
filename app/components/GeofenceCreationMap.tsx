import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface GeofenceCreationMapProps {
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation?: {
    latitude: number;
    longitude: number;
  };
  radius?: number;
}

export default function GeofenceCreationMap({ 
  currentLocation,
  onLocationSelect,
  selectedLocation,
  radius = 100
}: GeofenceCreationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const currentLocationMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = selectedLocation?.latitude || currentLocation?.latitude || 37.7749;
    const initialLng = selectedLocation?.longitude || currentLocation?.longitude || -122.4194;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: true,
    });

    mapRef.current = map;

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Add click handler
    map.on('click', (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    });

    // Show current location if available
    if (currentLocation) {
      const currentLocationIcon = L.divIcon({
        className: 'current-location-marker',
        html: `
          <div style="
            width: 20px;
            height: 20px;
            background: #3b82f6;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      currentLocationMarkerRef.current = L.marker(
        [currentLocation.latitude, currentLocation.longitude],
        { icon: currentLocationIcon }
      ).addTo(map);

      currentLocationMarkerRef.current.bindPopup('📍 Current Location');
    }

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
      currentLocationMarkerRef.current = null;
    };
  }, []);

  // Update selected location marker and circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedLocation) return;

    // Remove old marker and circle
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }
    if (circleRef.current) {
      map.removeLayer(circleRef.current);
    }

    // Create geofence marker icon
    const geofenceIcon = L.divIcon({
      className: 'geofence-marker',
      html: `
        <div style="
          position: relative;
          width: 40px;
          height: 40px;
        ">
          <div style="
            position: absolute;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: move;
          ">
            <span style="font-size: 20px;">📍</span>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
    });

    // Add draggable marker
    markerRef.current = L.marker(
      [selectedLocation.latitude, selectedLocation.longitude],
      { 
        icon: geofenceIcon,
        draggable: true
      }
    ).addTo(map);

    // Update coordinates when marker is dragged
    markerRef.current.on('dragend', () => {
      if (markerRef.current) {
        const pos = markerRef.current.getLatLng();
        onLocationSelect(pos.lat, pos.lng);
      }
    });

    markerRef.current.bindPopup(`
      <div style="font-family: system-ui; padding: 8px; min-width: 180px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
          🛡️ Geofence Location
        </h3>
        <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
          Click and drag to move
        </p>
      </div>
    `);

    // Add radius circle
    circleRef.current = L.circle(
      [selectedLocation.latitude, selectedLocation.longitude],
      {
        radius: radius,
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.2,
        weight: 2,
        dashArray: '5, 10',
      }
    ).addTo(map);

    // Center map on selected location
    map.setView([selectedLocation.latitude, selectedLocation.longitude], map.getZoom());
  }, [selectedLocation, radius, onLocationSelect]);

  return (
    <>
      <style>
        {`
          .leaflet-container {
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            cursor: crosshair;
          }
          
          .leaflet-container .leaflet-marker-draggable {
            cursor: move;
          }
          
          .leaflet-popup-content-wrapper {
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }
          
          /* Ensure map doesn't interfere with sidebar */
          .leaflet-container {
            z-index: 10 !important;
          }
          
          .leaflet-control-container {
            z-index: 11 !important;
          }
        `}
      </style>
      <div 
        ref={mapContainerRef} 
        className="w-full h-[350px] md:h-[400px] rounded-xl overflow-hidden"
      />
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
        <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
        <span>Click anywhere on the map to set geofence location (or drag the pin)</span>
      </div>
    </>
  );
}

