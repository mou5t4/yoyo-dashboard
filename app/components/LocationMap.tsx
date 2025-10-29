import { useEffect, useRef } from 'react';
import L from 'leaflet';

// Fix for default marker icon issue in Leaflet with webpack/vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  address?: string;
}

interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  enabled: boolean;
  alertOnExit: boolean;
  alertOnEnter: boolean;
}

interface LocationMapProps {
  currentLocation: LocationData;
  geofences?: Geofence[];
  height?: string;
  className?: string;
}

export default function LocationMap({ 
  currentLocation, 
  geofences = [], 
  height = "500px",
  className = ""
}: LocationMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      center: [currentLocation.latitude, currentLocation.longitude],
      zoom: 15,
      zoomControl: true,
    });

    mapRef.current = map;

    // Add beautiful tile layer (using OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Force Leaflet to recalculate the map size after a short delay
    // This ensures the map renders correctly in all containers
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing layers except the base tile layer
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    // Add current location marker with custom styling
    const currentLocationIcon = L.divIcon({
      className: 'custom-location-marker',
      html: `
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
        ">
          <div style="
            position: absolute;
            width: 30px;
            height: 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
            animation: pulse 2s ease-in-out infinite;
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const marker = L.marker(
      [currentLocation.latitude, currentLocation.longitude],
      { icon: currentLocationIcon }
    ).addTo(map);

    // Add popup with location info
    marker.bindPopup(`
      <div style="font-family: system-ui; padding: 8px; min-width: 200px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
          📍 Current Location
        </h3>
        ${currentLocation.address ? `
          <p style="margin: 4px 0; font-size: 14px; color: #4b5563;">
            <strong>${currentLocation.address}</strong>
          </p>
        ` : ''}
        <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
          Lat: ${currentLocation.latitude.toFixed(6)}<br/>
          Lon: ${currentLocation.longitude.toFixed(6)}
        </p>
        <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
          Accuracy: ±${currentLocation.accuracy}m
        </p>
      </div>
    `);

    // Add accuracy circle
    L.circle(
      [currentLocation.latitude, currentLocation.longitude],
      {
        radius: currentLocation.accuracy,
        color: '#667eea',
        fillColor: '#667eea',
        fillOpacity: 0.1,
        weight: 2,
      }
    ).addTo(map);

    // Add geofences
    geofences.forEach((geofence) => {
      const geofenceColor = geofence.enabled ? '#10b981' : '#6b7280';
      
      // Add geofence circle
      const circle = L.circle(
        [geofence.latitude, geofence.longitude],
        {
          radius: geofence.radius,
          color: geofenceColor,
          fillColor: geofenceColor,
          fillOpacity: 0.15,
          weight: 2,
          dashArray: '5, 10',
        }
      ).addTo(map);

      // Add geofence marker
      const geofenceIcon = L.divIcon({
        className: 'custom-geofence-marker',
        html: `
          <div style="
            width: 24px;
            height: 24px;
            background: ${geofenceColor};
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            color: white;
          ">🛡️</div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const geofenceMarker = L.marker(
        [geofence.latitude, geofence.longitude],
        { icon: geofenceIcon }
      ).addTo(map);

      // Add geofence popup
      geofenceMarker.bindPopup(`
        <div style="font-family: system-ui; padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
            🛡️ ${geofence.name}
          </h3>
          <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
            Radius: ${geofence.radius}m
          </p>
          <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
            Status: <span style="color: ${geofence.enabled ? '#10b981' : '#6b7280'};">
              ${geofence.enabled ? 'Active' : 'Inactive'}
            </span>
          </p>
          ${geofence.alertOnExit || geofence.alertOnEnter ? `
            <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
              Alerts: ${[
                geofence.alertOnExit ? 'Exit' : '',
                geofence.alertOnEnter ? 'Enter' : ''
              ].filter(Boolean).join(', ')}
            </p>
          ` : ''}
        </div>
      `);
    });

    // Fit map to show all markers
    const bounds = L.latLngBounds([
      [currentLocation.latitude, currentLocation.longitude],
      ...geofences.map(g => [g.latitude, g.longitude] as [number, number])
    ]);
    
    if (geofences.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([currentLocation.latitude, currentLocation.longitude], 15);
    }
  }, [currentLocation, geofences]);

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }

          .location-map-container {
            width: 100%;
            height: 400px;
            border-radius: 12px;
            overflow: hidden;
          }

          @media (min-width: 768px) {
            .location-map-container {
              height: 500px;
            }
          }

          .location-map-container .leaflet-container {
            width: 100%;
            height: 100%;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            z-index: 10 !important;
          }

          .leaflet-popup-content-wrapper {
            border-radius: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          }

          .leaflet-popup-tip {
            box-shadow: 0 3px 14px rgba(0, 0, 0, 0.1);
          }

          .leaflet-control-container {
            z-index: 11 !important;
          }
        `}
      </style>
      <div className={`location-map-container ${className}`}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </>
  );
}

