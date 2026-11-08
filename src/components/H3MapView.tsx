import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  Box,
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Hexagon,
  MapPin,
  ExternalLink,
  Activity,
  Users,
  TrendingUp,
  Building2,
  HeartPulse,
  GraduationCap,
  Sun,
  Eye,
  EyeOff,
  Globe,
  Cpu,
  Database,
  Download,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import {
  H3CellProperties,
  H3CoverageMode,
  NeighborhoodData,
  SurveyYear,
  VulnerabilityWeights,
} from '../types/kandira';
import {
  KONTUR_DATASET_METADATA,
  createKonturExportGeoJSON,
  generateKandiraH3GeoJSON,
  parseKonturH3GeoJSON,
} from '../utils/h3SpatialEngine';

export interface H3MapViewProps {
  neighborhoods: NeighborhoodData[];
  selectedYear: SurveyYear;
  weights: VulnerabilityWeights;
  selectedNeighborhood: NeighborhoodData | null;
  onSelectNeighborhood: (n: NeighborhoodData) => void;
  onOpenDetailDrawer: (n: NeighborhoodData) => void;
}

export type H3ThematicLayer =
  | 'konturPopulation'
  | 'konturPopulationDensity'
  | 'vulnerabilityScore'
  | 'popChange5YrPct'
  | 'elderlyPct'
  | 'builtUpChange5YrPct'
  | 'healthAccessMin'
  | 'educationAccessMin'
  | 'summerPopEstimate';

export type WebglTileStyle = 'voyager' | 'positron' | 'dark' | 'osm';

export const WEBGL_TILE_STYLES: Record<
  WebglTileStyle,
  {
    id: WebglTileStyle;
    label: string;
    bgColor: string;
    tiles: string[];
    attribution: string;
  }
> = {
  voyager: {
    id: 'voyager',
    label: 'Carto Voyager',
    bgColor: '#f1f5f9',
    tiles: [
      'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
    ],
    attribution: '© OpenStreetMap contributors, © CARTO (Keyless Open Basemap)',
  },
  positron: {
    id: 'positron',
    label: 'Carto Positron',
    bgColor: '#e2e8f0',
    tiles: [
      'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
    ],
    attribution: '© OpenStreetMap contributors, © CARTO Positron (Keyless)',
  },
  dark: {
    id: 'dark',
    label: 'Carto Dark',
    bgColor: '#0f172a',
    tiles: [
      'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    ],
    attribution: '© OpenStreetMap contributors, © CARTO Dark Matter (Keyless)',
  },
  osm: {
    id: 'osm',
    label: 'OSM Standart',
    bgColor: '#e2e8f0',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors (Keyless Open Tile Server)',
  },
};

interface LayerConfig {
  id: H3ThematicLayer;
  label: string;
  shortLabel: string;
  unit: string;
  description: string;
  icon: React.ReactNode;
  stops: Array<{ value: number; color: string; label: string }>;
  formatValue: (val: number) => string;
}

const LAYER_CONFIGS: Record<H3ThematicLayer, LayerConfig> = {
  konturPopulation: {
    id: 'konturPopulation',
    label: 'Kontur Nüfus Yoğunluğu (HDX 400m H3)',
    shortLabel: 'Kontur Nüfus',
    unit: 'kişi / hücre',
    description:
      'HDX Kontur Population Türkiye (GHSL + HRSL + Microsoft Bina + OSM) H3 altıgen nüfus dağılımı',
    icon: <Database className="w-3.5 h-3.5" />,
    stops: [
      { value: 15, color: '#0ea5e9', label: 'Seyrek (<20)' },
      { value: 120, color: '#10b981', label: 'Orta (120)' },
      { value: 450, color: '#f59e0b', label: 'Yoğun (450)' },
      { value: 1400, color: '#e11d48', label: 'Merkez (1.400+)' },
    ],
    formatValue: (v) => `${Math.round(v).toLocaleString('tr-TR')} kişi`,
  },
  konturPopulationDensity: {
    id: 'konturPopulationDensity',
    label: 'Kontur Nüfus Yoğunluğu (kişi/km²)',
    shortLabel: 'Kontur Yoğunluk',
    unit: 'kişi/km²',
    description:
      'HDX Kontur Population Türkiye 400m H3 altıgen alanı başına düşen km² nüfus yoğunluğu',
    icon: <Database className="w-3.5 h-3.5" />,
    stops: [
      { value: 20, color: '#0ea5e9', label: 'Seyrek (<30)' },
      { value: 160, color: '#10b981', label: 'Orta (160)' },
      { value: 600, color: '#f59e0b', label: 'Yoğun (600)' },
      { value: 1900, color: '#e11d48', label: 'Merkez (1.900+)' },
    ],
    formatValue: (v) => `${Math.round(v).toLocaleString('tr-TR')} kişi/km²`,
  },
  vulnerabilityScore: {
    id: 'vulnerabilityScore',
    label: 'Bileşik Kırılganlık Endeksi (0-100)',
    shortLabel: 'Kırılganlık Endeksi',
    unit: 'puan',
    description: 'Yaşlı nüfus, sosyal yardım, sağlık/eğitim erişimi ve arazi baskısı ağırlıklı skor',
    icon: <Activity className="w-3.5 h-3.5" />,
    stops: [
      { value: 20, color: '#10b981', label: 'Düşük (<25)' },
      { value: 42, color: '#eab308', label: 'Orta (40)' },
      { value: 60, color: '#f97316', label: 'Yüksek (60)' },
      { value: 78, color: '#e11d48', label: 'Kritik (75+)' },
    ],
    formatValue: (v) => `${v.toFixed(1)} / 100`,
  },
  popChange5YrPct: {
    id: 'popChange5YrPct',
    label: '5 Yıllık Nüfus Değişimi (%)',
    shortLabel: 'Nüfus Değişimi (5 Yıl)',
    unit: '%',
    description: '2021–2025 arası mahalle bazlı kümülatif nüfus artış veya kırsal kayıp oranı',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    stops: [
      { value: -10, color: '#2563eb', label: 'Azalış (-%10)' },
      { value: 0, color: '#94a3b8', label: 'Dengeli (%0)' },
      { value: 12, color: '#f59e0b', label: 'Artış (+%12)' },
      { value: 25, color: '#e11d48', label: 'Hızlı Göç (+%25)' },
    ],
    formatValue: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`,
  },
  elderlyPct: {
    id: 'elderlyPct',
    label: '65+ Yaşlı Nüfus Yoğunluğu (%)',
    shortLabel: '65+ Yaşlı Oranı',
    unit: '%',
    description: 'Toplam mahalle nüfusu içinde 65 yaş ve üzeri kırsal/kentsel nüfus payı',
    icon: <Users className="w-3.5 h-3.5" />,
    stops: [
      { value: 13, color: '#0d9488', label: 'Genç (%13)' },
      { value: 22, color: '#eab308', label: 'Orta (%22)' },
      { value: 30, color: '#f97316', label: 'Yaşlı (%30)' },
      { value: 38, color: '#be123c', label: 'Çok Yaşlı (%38+)' },
    ],
    formatValue: (v) => `%${v.toFixed(1)}`,
  },
  builtUpChange5YrPct: {
    id: 'builtUpChange5YrPct',
    label: 'Arazi & Yapılaşma Artışı (5 Yıl %)',
    shortLabel: 'Yapılaşma Artışı',
    unit: '%',
    description: '2021–2025 arası geçirimsiz yüzey, yeni konut ve kıyı imar baskısı değişimi',
    icon: <Building2 className="w-3.5 h-3.5" />,
    stops: [
      { value: 5, color: '#22c55e', label: 'Korunan (<%8)' },
      { value: 18, color: '#eab308', label: 'Ilımlı (%18)' },
      { value: 32, color: '#f97316', label: 'Yoğun (%32)' },
      { value: 45, color: '#dc2626', label: 'Kıyı Baskısı (%45+)' },
    ],
    formatValue: (v) => `+%${v.toFixed(1)}`,
  },
  healthAccessMin: {
    id: 'healthAccessMin',
    label: 'Sağlık Hizmetine Erişim Süresi (Dk)',
    shortLabel: 'Sağlık Erişimi (Dk)',
    unit: 'dk',
    description: 'ASM veya Kandıra Devlet Hastanesi acil servisine ortalama ulaşım süresi',
    icon: <HeartPulse className="w-3.5 h-3.5" />,
    stops: [
      { value: 5, color: '#06b6d4', label: 'Hızlı (5 dk)' },
      { value: 11, color: '#10b981', label: 'Orta (11 dk)' },
      { value: 17, color: '#f59e0b', label: 'Uzak (17 dk)' },
      { value: 23, color: '#dc2626', label: 'Kritik (22+ dk)' },
    ],
    formatValue: (v) => `${Math.round(v)} dk`,
  },
  educationAccessMin: {
    id: 'educationAccessMin',
    label: 'Eğitim Hizmetine Erişim Süresi (Dk)',
    shortLabel: 'Eğitim Erişimi (Dk)',
    unit: 'dk',
    description: 'İlkokul, ortaokul veya taşımalı eğitim merkezine ortalama ulaşım süresi',
    icon: <GraduationCap className="w-3.5 h-3.5" />,
    stops: [
      { value: 4, color: '#0ea5e9', label: 'Yakın (4 dk)' },
      { value: 9, color: '#10b981', label: 'Orta (9 dk)' },
      { value: 14, color: '#f59e0b', label: 'Taşımalı (14 dk)' },
      { value: 19, color: '#e11d48', label: 'Uzak (19+ dk)' },
    ],
    formatValue: (v) => `${Math.round(v)} dk`,
  },
  summerPopEstimate: {
    id: 'summerPopEstimate',
    label: 'Yazlık / Mevsimsel Nüfus Yoğunluğu',
    shortLabel: 'Yaz Nüfusu (Hücre)',
    unit: 'kişi',
    description: 'Temmuz–Ağustos turizm ve fındık hasadı döneminde altıgen başına düşen tepe nüfus',
    icon: <Sun className="w-3.5 h-3.5" />,
    stops: [
      { value: 80, color: '#0ea5e9', label: 'Kırsal (<100)' },
      { value: 450, color: '#6366f1', label: 'Orta (450)' },
      { value: 1800, color: '#a855f7', label: 'Yoğun (1.800)' },
      { value: 4500, color: '#db2777', label: 'Turizm Pik (4.500+)' },
    ],
    formatValue: (v) => `${Math.round(v).toLocaleString('tr-TR')} kişi`,
  },
};

function buildColorExpression(layer: H3ThematicLayer): maplibregl.ExpressionSpecification {
  const stops = LAYER_CONFIGS[layer].stops;
  return [
    'interpolate',
    ['linear'],
    ['to-number', ['get', layer], 0],
    stops[0].value,
    stops[0].color,
    stops[1].value,
    stops[1].color,
    stops[2].value,
    stops[2].color,
    stops[3].value,
    stops[3].color,
  ];
}

function buildExtrusionHeightExpression(
  layer: H3ThematicLayer,
  is3DMode: boolean
): maplibregl.ExpressionSpecification | number {
  if (!is3DMode) return 0;
  const stops = LAYER_CONFIGS[layer].stops;
  return [
    'interpolate',
    ['linear'],
    ['max', stops[0].value, ['to-number', ['get', layer], 0]],
    stops[0].value,
    60,
    stops[1].value,
    450,
    stops[2].value,
    1150,
    stops[3].value,
    2200,
  ];
}

// Geographic bounding box for Kandıra SVG Cartographic Studio
const BOUNDS = {
  minLng: 30.01,
  maxLng: 30.40,
  minLat: 40.94,
  maxLat: 41.215,
};

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 680;

function projectLngLat([lng, lat]: [number, number]): [number, number] {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * SVG_WIDTH;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * SVG_HEIGHT;
  return [Number(x.toFixed(1)), Number(y.toFixed(1))];
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getInterpolatedColor(value: number, layer: H3ThematicLayer): string {
  const stops = LAYER_CONFIGS[layer].stops;
  if (value <= stops[0].value) return stops[0].color;
  if (value >= stops[stops.length - 1].value) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    const start = stops[i];
    const end = stops[i + 1];
    if (value >= start.value && value <= end.value) {
      const ratio = (value - start.value) / Math.max(0.0001, end.value - start.value);
      const [r1, g1, b1] = hexToRgb(start.color);
      const [r2, g2, b2] = hexToRgb(end.color);
      return rgbToHex(
        r1 + (r2 - r1) * ratio,
        g1 + (g2 - g1) * ratio,
        b1 + (b2 - b1) * ratio
      );
    }
  }
  return stops[0].color;
}

export const H3MapView: React.FC<H3MapViewProps> = ({
  neighborhoods,
  selectedYear,
  weights,
  selectedNeighborhood,
  onSelectNeighborhood,
  onOpenDetailDrawer,
}) => {
  const [activeLayer, setActiveLayer] = useState<H3ThematicLayer>('vulnerabilityScore');
  const [resolution, setResolution] = useState<7 | 8>(8);
  const [coverageMode, setCoverageMode] = useState<H3CoverageMode>('kontur_full');
  const [is3D, setIs3D] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  // Default to WebGL (MapLibre GL) with 100% keyless open-source tile servers (CARTO / OSM)
  const [basemapMode, setBasemapMode] = useState<'vector' | 'webgl'>('webgl');
  const [tileStyle, setTileStyle] = useState<WebglTileStyle>('voyager');
  const [webglReady, setWebglReady] = useState<boolean>(true);

  // Custom uploaded Kontur GeoJSON dataset state
  const [customKonturMap, setCustomKonturMap] = useState<ReadonlyMap<string, number> | undefined>(
    undefined
  );
  const [customKonturInfo, setCustomKonturInfo] = useState<{
    fileName: string;
    cellCount: number;
    totalPopulation: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Hovered or pinned H3 cell properties
  const [hoveredCell, setHoveredCell] = useState<H3CellProperties | null>(null);

  // SVG Pan/Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);

  // Generate H3 GeoJSON FeatureCollection dynamically
  const h3GeoJSON = useMemo(() => {
    return generateKandiraH3GeoJSON(
      neighborhoods,
      selectedYear,
      resolution,
      weights,
      coverageMode,
      customKonturMap
    );
  }, [neighborhoods, selectedYear, resolution, weights, coverageMode, customKonturMap]);

  // Neighborhood centroids GeoJSON for WebGL markers & labels
  const neighborhoodPinsGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: neighborhoods.map((n) => ({
        type: 'Feature' as const,
        id: n.id,
        properties: {
          id: n.id,
          name: n.name.replace(' (Kerpe)', ''),
          isSelected: selectedNeighborhood?.id === n.id,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: n.coordinates,
        },
      })),
    };
  }, [neighborhoods, selectedNeighborhood]);

  // Compute summary stats for legend
  const h3Stats = useMemo(() => {
    const features = h3GeoJSON.features;
    const totalCells = features.length;
    let coreCells = 0;
    let sumMetric = 0;
    let sumKonturPop = 0;
    let minVal = Infinity;
    let maxVal = -Infinity;

    for (const f of features) {
      if (f.properties.isCoreCell) coreCells += 1;
      const val = Number(f.properties[activeLayer] ?? 0);
      sumMetric += val;
      sumKonturPop += Number(f.properties.konturPopulation ?? 0);
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }

    return {
      totalCells,
      coreCells,
      ringCells: totalCells - coreCells,
      avgVal: totalCells > 0 ? sumMetric / totalCells : 0,
      totalKonturPop: sumKonturPop,
      minVal: minVal === Infinity ? 0 : minVal,
      maxVal: maxVal === -Infinity ? 0 : maxVal,
    };
  }, [h3GeoJSON, activeLayer]);

  // Active inspected cell: either hovered cell, or the core cell of selectedNeighborhood
  const inspectedCell = useMemo<H3CellProperties | null>(() => {
    if (hoveredCell) return hoveredCell;
    if (selectedNeighborhood) {
      const found = h3GeoJSON.features.find(
        (f) =>
          f.properties.neighborhoodId === selectedNeighborhood.id &&
          f.properties.isCoreCell
      );
      if (found) return found.properties;
    }
    return null;
  }, [hoveredCell, selectedNeighborhood, h3GeoJSON]);

  // Initialize / update MapLibre GL when basemapMode === 'webgl'
  useEffect(() => {
    if (basemapMode !== 'webgl' || !mapContainerRef.current) {
      return;
    }

    const activeTileCfg = WEBGL_TILE_STYLES[tileStyle];
    let map: maplibregl.Map | null = null;

    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: {
            'open-basemap-tiles': {
              type: 'raster',
              tiles: activeTileCfg.tiles,
              tileSize: 256,
              attribution: activeTileCfg.attribution,
            },
          },
          layers: [
            {
              id: 'background-fill',
              type: 'background',
              paint: {
                'background-color': activeTileCfg.bgColor,
              },
            },
            {
              id: 'open-basemap-layer',
              type: 'raster',
              source: 'open-basemap-tiles',
              minzoom: 0,
              maxzoom: 19,
            },
          ],
        },
        center: [30.185, 41.078],
        zoom: 10.2,
        pitch: is3D ? 48 : 0,
        bearing: is3D ? -12 : 0,
        failIfMajorPerformanceCaveat: false,
      });

      mapInstanceRef.current = map;
      setWebglReady(true);

      map.on('load', () => {
        if (!map) return;

        map.addSource('kandira-h3', {
          type: 'geojson',
          data: h3GeoJSON as unknown as GeoJSON.FeatureCollection,
        });

        map.addLayer({
          id: 'h3-extrusion',
          type: 'fill-extrusion',
          source: 'kandira-h3',
          paint: {
            'fill-extrusion-color': buildColorExpression(activeLayer),
            'fill-extrusion-height': buildExtrusionHeightExpression(activeLayer, is3D),
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.82,
          },
        });

        map.addLayer({
          id: 'h3-outline',
          type: 'line',
          source: 'kandira-h3',
          paint: {
            'line-color': [
              'case',
              ['boolean', ['get', 'isCoreCell'], false],
              '#0f172a',
              '#ffffff',
            ],
            'line-width': [
              'case',
              ['boolean', ['get', 'isCoreCell'], false],
              1.6,
              0.75,
            ],
            'line-opacity': 0.78,
          },
        });

        // Add neighborhood pins & labels source and layers in WebGL mode
        map.addSource('kandira-neighborhood-pins', {
          type: 'geojson',
          data: neighborhoodPinsGeoJSON as unknown as GeoJSON.FeatureCollection,
        });

        map.addLayer({
          id: 'kandira-neighborhood-circles',
          type: 'circle',
          source: 'kandira-neighborhood-pins',
          layout: {
            visibility: showLabels ? 'visible' : 'none',
          },
          paint: {
            'circle-radius': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              6.5,
              4,
            ],
            'circle-color': [
              'case',
              ['boolean', ['get', 'isSelected'], false],
              '#fbbf24',
              '#ffffff',
            ],
            'circle-stroke-color': '#0f172a',
            'circle-stroke-width': 1.8,
          },
        });

        map.addLayer({
          id: 'kandira-neighborhood-labels',
          type: 'symbol',
          source: 'kandira-neighborhood-pins',
          layout: {
            visibility: showLabels ? 'visible' : 'none',
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Semibold'],
            'text-size': 11,
            'text-offset': [0, -1.1],
            'text-anchor': 'bottom',
          },
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.8,
          },
        });

        map.on('mousemove', 'h3-extrusion', (e) => {
          if (!e.features || e.features.length === 0) return;
          map!.getCanvas().style.cursor = 'pointer';
          const props = e.features[0].properties as unknown as H3CellProperties;
          if (props && props.h3Index) {
            setHoveredCell({
              ...props,
              h3: String(props.h3 || props.h3Index),
              population: Number(props.population),
              konturPopulation: Number(props.konturPopulation ?? props.population),
              konturDensityPerKm2: Number(props.konturDensityPerKm2 ?? 0),
              konturPopulationDensity: Number(
                props.konturPopulationDensity ?? props.konturDensityPerKm2 ?? 0
              ),
              popChange5YrPct: Number(props.popChange5YrPct),
              elderlyPct: Number(props.elderlyPct),
              youthPct: Number(props.youthPct),
              vulnerabilityScore: Number(props.vulnerabilityScore),
              builtUpPct: Number(props.builtUpPct),
              builtUpChange5YrPct: Number(props.builtUpChange5YrPct),
              forestPct: Number(props.forestPct),
              agriculturePct: Number(props.agriculturePct),
              healthAccessMin: Number(props.healthAccessMin),
              educationAccessMin: Number(props.educationAccessMin),
              summerPopEstimate: Number(props.summerPopEstimate),
              isCoreCell: Boolean(props.isCoreCell),
            });
          }
        });

        map.on('mouseleave', 'h3-extrusion', () => {
          if (!map) return;
          map.getCanvas().style.cursor = '';
          setHoveredCell(null);
        });

        map.on('click', 'h3-extrusion', (e) => {
          if (!e.features || e.features.length === 0) return;
          const props = e.features[0].properties as unknown as H3CellProperties;
          const matched = neighborhoods.find((n) => n.id === props.neighborhoodId);
          if (matched) {
            onSelectNeighborhood(matched);
          }
        });

        map.on('click', 'kandira-neighborhood-circles', (e) => {
          if (!e.features || e.features.length === 0) return;
          const pinId = String(e.features[0].properties?.id ?? '');
          const matched = neighborhoods.find((n) => n.id === pinId);
          if (matched) {
            onSelectNeighborhood(matched);
          }
        });
      });

      map.on('error', () => {
        // Keep map functional even if external tiles or fonts fail in restricted sandboxes
      });
    } catch {
      // Seamless headless fallback without throwing or showing any API key / WebGL error banner
      setWebglReady(false);
    }

    return () => {
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [basemapMode, tileStyle]);

  // Synchronize GeoJSON data & paint expressions when props change in WebGL mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || basemapMode !== 'webgl') return;

    const source = map.getSource('kandira-h3') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(h3GeoJSON as unknown as GeoJSON.FeatureCollection);
    }

    const pinsSource = map.getSource('kandira-neighborhood-pins') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (pinsSource) {
      pinsSource.setData(neighborhoodPinsGeoJSON as unknown as GeoJSON.FeatureCollection);
    }

    if (map.getLayer('h3-extrusion')) {
      map.setPaintProperty(
        'h3-extrusion',
        'fill-extrusion-color',
        buildColorExpression(activeLayer)
      );
      map.setPaintProperty(
        'h3-extrusion',
        'fill-extrusion-height',
        buildExtrusionHeightExpression(activeLayer, is3D)
      );
    }

    if (map.getLayer('kandira-neighborhood-circles')) {
      map.setLayoutProperty(
        'kandira-neighborhood-circles',
        'visibility',
        showLabels ? 'visible' : 'none'
      );
    }
    if (map.getLayer('kandira-neighborhood-labels')) {
      map.setLayoutProperty(
        'kandira-neighborhood-labels',
        'visibility',
        showLabels ? 'visible' : 'none'
      );
    }

    map.easeTo({
      pitch: is3D ? 48 : 0,
      bearing: is3D ? -12 : 0,
      duration: 450,
    });
  }, [h3GeoJSON, neighborhoodPinsGeoJSON, activeLayer, is3D, showLabels, basemapMode]);

  // Fly to selected neighborhood in WebGL mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || basemapMode !== 'webgl' || !selectedNeighborhood) return;
    map.flyTo({
      center: selectedNeighborhood.coordinates,
      zoom: 11.4,
      duration: 650,
    });
  }, [selectedNeighborhood, basemapMode]);

  const currentLayerConfig = LAYER_CONFIGS[activeLayer];

  // Export current H3 grid in official Kontur Population GeoJSON schema
  const handleExportKonturGeoJSON = () => {
    const exported = createKonturExportGeoJSON(h3GeoJSON);
    const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: 'application/geo+json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kandira_kontur_population_h3_res${resolution}_${selectedYear}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import custom Kontur Population GeoJSON file
  const handleImportKonturFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const parsed = parseKonturH3GeoJSON(text, resolution);
      if (parsed.cellCount > 0) {
        setCustomKonturMap(parsed.map);
        setCustomKonturInfo({
          fileName: file.name,
          cellCount: parsed.cellCount,
          totalPopulation: parsed.totalPopulation,
        });
        setCoverageMode('kontur_full');
        setActiveLayer('konturPopulation');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Coastline & hydrography SVG paths for Vector H3 Studio
  const blackSeaPolygonPoints = useMemo(() => {
    const coastCoords: [number, number][] = [
      [30.01, 41.215],
      [30.40, 41.215],
      [30.40, 41.192],
      [30.365, 41.190], // Babalı / Dikili
      [30.325, 41.188],
      [30.292, 41.186], // Cebeci
      [30.262, 41.174], // Kefken
      [30.232, 41.168], // Kapri / Kumcağız
      [30.204, 41.158], // Kerpe Burnu
      [30.175, 41.152], // Sarısu
      [30.145, 41.148], // Seyrek / Pınarlı
      [30.095, 41.144],
      [30.062, 41.142], // Bağırganlı
      [30.01, 41.132],
    ];
    return coastCoords.map((c) => projectLngLat(c).join(',')).join(' ');
  }, []);

  const districtLandPoints = useMemo(() => {
    const landCoords: [number, number][] = [
      [30.01, 41.132],
      [30.062, 41.142],
      [30.145, 41.148],
      [30.204, 41.158],
      [30.262, 41.174],
      [30.292, 41.186],
      [30.365, 41.190],
      [30.40, 41.192],
      [30.39, 40.96],
      [30.28, 40.945],
      [30.15, 40.945],
      [30.02, 40.965],
    ];
    return landCoords.map((c) => projectLngLat(c).join(',')).join(' ');
  }, []);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleOpenInspectedDrawer = () => {
    if (!inspectedCell) return;
    const found = neighborhoods.find((n) => n.id === inspectedCell.neighborhoodId);
    if (found) {
      onOpenDetailDrawer(found);
    }
  };

  const showSvgFallback = basemapMode === 'vector' || !webglReady;

  return (
    <div className="relative bg-slate-900 rounded-2xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col">
      {/* Top Studio Control Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex flex-col gap-2.5 z-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: 8 Thematic Layer Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              H3 Katmanı:
            </span>
            {(Object.keys(LAYER_CONFIGS) as H3ThematicLayer[]).map((layerKey) => {
              const cfg = LAYER_CONFIGS[layerKey];
              const active = activeLayer === layerKey;
              return (
                <button
                  key={layerKey}
                  type="button"
                  onClick={() => setActiveLayer(layerKey)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/75 hover:text-slate-900'
                  }`}
                >
                  {cfg.icon}
                  <span>{cfg.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Right: H3 Resolution, 2D/3D Extrusion, Basemap Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Resolution Switcher */}
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setResolution(7)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition ${
                  resolution === 7
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="H3 Çözünürlük 7 (~5.16 km² Makro Havza Altıgeni)"
              >
                H3 Çöz. 7 (Makro)
              </button>
              <button
                type="button"
                onClick={() => setResolution(8)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition ${
                  resolution === 8
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="H3 Çözünürlük 8 (~0.73 km² Kontur 400m Mikro Altıgeni)"
              >
                H3 Çöz. 8 (Mikro)
              </button>
            </div>

            {/* 2D / 3D Extrusion Toggle */}
            <button
              type="button"
              onClick={() => setIs3D((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition ${
                is3D
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="3B Prizma Yükseklik Görünümü"
            >
              <Box className="w-3.5 h-3.5 text-amber-600" />
              <span>{is3D ? '3B Prizma Aktif' : '2B / 3B Prizma'}</span>
            </button>

            {/* Labels toggle */}
            <button
              type="button"
              onClick={() => setShowLabels((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              title="Mahalle Etiketlerini Göster/Gizle"
            >
              {showLabels ? (
                <Eye className="w-3.5 h-3.5 text-teal-600" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">Etiketler</span>
            </button>

            {/* Basemap Switcher: WebGL Harita (Default) vs Vektör H3 Stüdyo */}
            <div
              className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200"
              title="Harita Motoru Seçimi"
            >
              <button
                type="button"
                onClick={() => setBasemapMode('webgl')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  basemapMode === 'webgl'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3 h-3" />
                <span>WebGL Harita</span>
              </button>
              <button
                type="button"
                onClick={() => setBasemapMode('vector')}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  basemapMode === 'vector'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>Vektör H3 Stüdyo</span>
              </button>
            </div>
          </div>
        </div>

        {/* Second Row: Kontur Population Türkiye (HDX H3) Coverage & Keyless WebGL Basemap Controls */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Left: Kontur H3 Coverage Mode Switcher & HDX GeoJSON Import/Export */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-sky-600" />
              H3 Kapsamı:
            </span>
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCoverageMode('kontur_full')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  coverageMode === 'kontur_full'
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={`${KONTUR_DATASET_METADATA.title} (${KONTUR_DATASET_METADATA.license})`}
              >
                Kontur Tam Saha (HDX H3)
              </button>
              <button
                type="button"
                onClick={() => setCoverageMode('mahalle_catchment')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  coverageMode === 'mahalle_catchment'
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="36 Mahalle Merkez + Çeper Havza Altıgenleri"
              >
                Mahalle Havzası (36 Merkez)
              </button>
            </div>

            {/* Kontur GeoJSON Export & Import Buttons */}
            <button
              type="button"
              onClick={handleExportKonturGeoJSON}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition"
              title="Kandıra Kontur Population H3 altıgenlerini standart GeoJSON ({ fid, h3, population }) olarak indir"
            >
              <Download className="w-3 h-3" />
              <span>Kontur GeoJSON İndir</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200/80 transition"
              title="HDX Kontur Population Türkiye (.geojson / .json) altıgen dosyasını haritaya yükle"
            >
              <Upload className="w-3 h-3" />
              <span>Kontur GeoJSON Yükle</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,application/geo+json,application/json"
              onChange={handleImportKonturFile}
              className="hidden"
            />

            {customKonturInfo && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>
                  {customKonturInfo.fileName}: {customKonturInfo.cellCount} H3 (
                  {customKonturInfo.totalPopulation.toLocaleString('tr-TR')} kişi)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomKonturMap(undefined);
                    setCustomKonturInfo(null);
                  }}
                  className="ml-1 text-emerald-900 underline hover:no-underline"
                >
                  Sıfırla
                </button>
              </span>
            )}
          </div>

          {/* Right: Keyless Open-Source WebGL Tile Style Switcher & Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {basemapMode === 'webgl' && (
              <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                {(Object.keys(WEBGL_TILE_STYLES) as WebglTileStyle[]).map((styleKey) => {
                  const st = WEBGL_TILE_STYLES[styleKey];
                  return (
                    <button
                      key={styleKey}
                      type="button"
                      onClick={() => setTileStyle(styleKey)}
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition ${
                        tileStyle === styleKey
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>WebGL Aktif • API Anahtarsız Açık Kaynak Harita (CARTO / OSM)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Map Viewport Container */}
      <div className="relative w-full h-[540px] lg:h-[600px] bg-[#0f172a] overflow-hidden select-none">
        {/* Mode 1: MapLibre GL WebGL Canvas */}
        {basemapMode === 'webgl' && (
          <div
            ref={mapContainerRef}
            className={`w-full h-full ${showSvgFallback ? 'hidden' : 'block'}`}
          />
        )}

        {/* Mode 2: Interactive High-Precision SVG Cartographic H3 Studio (or Seamless Headless Fallback) */}
        {showSvgFallback && (
          <div
            className="w-full h-full relative overflow-hidden"
            style={{
              perspective: is3D ? '1100px' : 'none',
            }}
          >
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className={`w-full h-full transition-transform duration-300 ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) ${
                  is3D ? 'rotateX(28deg) scaleY(0.92)' : ''
                }`,
                transformOrigin: 'center center',
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <defs>
                <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#082f49" />
                  <stop offset="65%" stopColor="#0c4a6e" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
                <linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="50%" stopColor="#17253b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <filter id="hexGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* Base Background */}
              <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="#0b1324" />

              {/* District Land Basin */}
              <polygon
                points={districtLandPoints}
                fill="url(#landGrad)"
                stroke="#334155"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />

              {/* Black Sea (Karadeniz) Northern Coastline */}
              <polygon
                points={blackSeaPolygonPoints}
                fill="url(#seaGrad)"
                stroke="#38bdf8"
                strokeWidth={1.5}
                strokeOpacity={0.55}
              />

              {/* Kefken Island (Kefken Adası) */}
              {(() => {
                const [ix, iy] = projectLngLat([30.261, 41.193]);
                return (
                  <g>
                    <ellipse
                      cx={ix}
                      cy={iy}
                      rx={9}
                      ry={4.5}
                      fill="#1e293b"
                      stroke="#38bdf8"
                      strokeWidth={1}
                    />
                    <text
                      x={ix}
                      y={iy - 7}
                      textAnchor="middle"
                      fill="#7dd3fc"
                      fontSize={8.5}
                      fontFamily="monospace"
                      opacity={0.85}
                    >
                      Kefken Adası
                    </text>
                  </g>
                );
              })()}

              {/* Coordinate Graticule Grid Lines */}
              {[30.05, 30.1, 30.15, 30.2, 30.25, 30.3, 30.35].map((lng) => {
                const [x] = projectLngLat([lng, 41.0]);
                return (
                  <g key={`lng-${lng}`}>
                    <line
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={SVG_HEIGHT}
                      stroke="#334155"
                      strokeWidth={0.6}
                      strokeDasharray="3 5"
                      opacity={0.45}
                    />
                    <text
                      x={x + 4}
                      y={SVG_HEIGHT - 8}
                      fill="#64748b"
                      fontSize={9}
                      fontFamily="monospace"
                    >
                      {lng.toFixed(2)}°D
                    </text>
                  </g>
                );
              })}

              {[40.98, 41.03, 41.08, 41.13, 41.18].map((lat) => {
                const [, y] = projectLngLat([30.1, lat]);
                return (
                  <g key={`lat-${lat}`}>
                    <line
                      x1={0}
                      y1={y}
                      x2={SVG_WIDTH}
                      y2={y}
                      stroke="#334155"
                      strokeWidth={0.6}
                      strokeDasharray="3 5"
                      opacity={0.45}
                    />
                    <text
                      x={8}
                      y={y - 4}
                      fill="#64748b"
                      fontSize={9}
                      fontFamily="monospace"
                    >
                      {lat.toFixed(2)}°K
                    </text>
                  </g>
                );
              })}

              {/* Karadeniz Sea Label */}
              <text
                x={SVG_WIDTH * 0.46}
                y={36}
                textAnchor="middle"
                fill="#38bdf8"
                fontSize={14}
                fontWeight={700}
                letterSpacing={6}
                opacity={0.65}
              >
                KARADENİZ (KIYI EKOSİSTEMİ)
              </text>

              {/* Main Road Corridors (D-605 İzmit-Kandıra-Kefken/Cebeci & Kaynarca/Ağva Aksı) */}
              {(() => {
                const d605 = [
                  [30.125, 40.95],
                  [30.148, 41.015],
                  [30.158, 41.069], // Kandıra Merkez
                  [30.205, 41.152], // Kerpe
                  [30.261, 41.167], // Kefken
                  [30.289, 41.182], // Cebeci
                ]
                  .map((c) => projectLngLat(c as [number, number]).join(','))
                  .join(' ');

                const d020 = [
                  [30.02, 41.035],
                  [30.095, 41.055],
                  [30.158, 41.069],
                  [30.255, 41.068],
                  [30.365, 41.072],
                ]
                  .map((c) => projectLngLat(c as [number, number]).join(','))
                  .join(' ');

                return (
                  <g opacity={0.45}>
                    <polyline
                      points={d605}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                    />
                    <polyline
                      points={d020}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth={1.8}
                      strokeDasharray="4 4"
                    />
                  </g>
                );
              })()}

              {/* H3 Hexagonal Mesh Polygons */}
              <g>
                {h3GeoJSON.features.map((feature) => {
                  const props = feature.properties;
                  const ring = feature.geometry.coordinates[0];
                  const val = Number(props[activeLayer] ?? 0);
                  const fillColor = getInterpolatedColor(val, activeLayer);

                  const isHovered = hoveredCell?.h3Index === props.h3Index;
                  const isSelectedMahalle =
                    selectedNeighborhood?.id === props.neighborhoodId;

                  const projectedRing = ring.map((coord) =>
                    projectLngLat([coord[0], coord[1]])
                  );

                  // In 3D mode, shift top polygon upward proportional to normalized value
                  const normHeight = is3D
                    ? Math.max(
                        4,
                        Math.min(
                          28,
                          ((val - h3Stats.minVal) /
                            Math.max(1, h3Stats.maxVal - h3Stats.minVal)) *
                            26
                        )
                      )
                    : 0;

                  const basePointsStr = projectedRing
                    .map(([x, y]) => `${x},${y}`)
                    .join(' ');

                  const extrudedPointsStr = projectedRing
                    .map(([x, y]) => `${x},${(y - normHeight).toFixed(1)}`)
                    .join(' ');

                  return (
                    <g
                      key={props.h3Index}
                      className="cursor-pointer transition-opacity"
                      onMouseEnter={() => setHoveredCell(props)}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        const matched = neighborhoods.find(
                          (n) => n.id === props.neighborhoodId
                        );
                        if (matched) {
                          onSelectNeighborhood(matched);
                        }
                      }}
                    >
                      {/* 3D Prism Base Shadow if is3D */}
                      {is3D && (
                        <polygon
                          points={basePointsStr}
                          fill="#020617"
                          fillOpacity={0.65}
                          stroke={fillColor}
                          strokeWidth={0.8}
                          strokeOpacity={0.35}
                        />
                      )}

                      {/* Primary H3 Hexagon Polygon */}
                      <polygon
                        points={is3D ? extrudedPointsStr : basePointsStr}
                        fill={fillColor}
                        fillOpacity={
                          isHovered
                            ? 0.96
                            : isSelectedMahalle
                            ? 0.92
                            : props.isCoreCell
                            ? 0.84
                            : 0.66
                        }
                        stroke={
                          isHovered
                            ? '#ffffff'
                            : isSelectedMahalle
                            ? '#fbbf24'
                            : props.isCoreCell
                            ? '#0f172a'
                            : '#f8fafc'
                        }
                        strokeWidth={
                          isHovered
                            ? 2.4
                            : isSelectedMahalle
                            ? 2.0
                            : props.isCoreCell
                            ? 1.3
                            : 0.65
                        }
                        strokeOpacity={
                          isHovered || isSelectedMahalle
                            ? 1
                            : props.isCoreCell
                            ? 0.85
                            : 0.45
                        }
                        filter={isHovered || isSelectedMahalle ? 'url(#hexGlow)' : undefined}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Neighborhood Center Markers & Labels */}
              {showLabels &&
                neighborhoods.map((n) => {
                  const [cx, cy] = projectLngLat(n.coordinates);
                  const isSelected = selectedNeighborhood?.id === n.id;

                  return (
                    <g
                      key={n.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNeighborhood(n);
                      }}
                    >
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isSelected ? 5.5 : 3.2}
                        fill={isSelected ? '#fbbf24' : '#ffffff'}
                        stroke="#0f172a"
                        strokeWidth={1.6}
                      />
                      <text
                        x={cx}
                        y={cy - (isSelected ? 9 : 6)}
                        textAnchor="middle"
                        fill={isSelected ? '#fef08a' : '#f8fafc'}
                        fontSize={isSelected ? 10.5 : 8.5}
                        fontWeight={isSelected ? 700 : 600}
                        style={{
                          paintOrder: 'stroke',
                          stroke: '#0f172a',
                          strokeWidth: 2.8,
                          strokeLinecap: 'round',
                          strokeLinejoin: 'round',
                        }}
                      >
                        {n.name.replace(' (Kerpe)', '')}
                      </text>
                    </g>
                  );
                })}
            </svg>

            {/* Top-Left Zoom & Compass Controls for Vector Studio */}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1 flex flex-col gap-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.25).toFixed(2))))}
                  className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition"
                  title="Yakınlaştır"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.25).toFixed(2))))}
                  className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition"
                  title="Uzaklaştır"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  className="p-1.5 rounded-lg text-slate-200 hover:text-white hover:bg-slate-800 transition"
                  title="Görünümü Sıfırla"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-[10px] font-mono text-slate-300 flex items-center gap-1.5 shadow-md">
                <Compass className="w-3.5 h-3.5 text-teal-400" />
                <span>{Math.round(zoom * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom-Left Choropleth Legend & H3 Spatial Summary */}
        <div className="absolute bottom-3 left-3 z-20 max-w-xs sm:max-w-sm bg-slate-900/92 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 text-white shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Hexagon className="w-3.5 h-3.5 text-teal-400 fill-teal-400/20" />
              <span>{currentLayerConfig.label}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
              {selectedYear}
            </span>
          </div>

          <p className="text-[11px] text-slate-300 leading-snug mb-2.5">
            {currentLayerConfig.description}
          </p>

          {/* Gradient Bar */}
          <div
            className="h-2.5 w-full rounded-full mb-1.5 border border-white/15"
            style={{
              background: `linear-gradient(to right, ${currentLayerConfig.stops
                .map((s) => s.color)
                .join(', ')})`,
            }}
          />

          {/* Stop Labels */}
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-300">
            {currentLayerConfig.stops.map((s) => (
              <div key={s.label} className="flex items-center gap-1 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="truncate">{s.label}</span>
              </div>
            ))}
          </div>

          {/* H3 Cell Statistics Footer */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-col gap-1 text-[10px] font-mono text-slate-400">
            <div className="flex items-center justify-between">
              <span>
                Toplam: <strong className="text-white">{h3Stats.totalCells}</strong> H3 Hücre
              </span>
              <span>
                Merkez: <strong className="text-teal-300">{h3Stats.coreCells}</strong> • Çeper:{' '}
                <strong className="text-slate-200">{h3Stats.ringCells}</strong>
              </span>
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-sky-300/90">
              <span>Kaynak: HDX Kontur Population Türkiye (CC BY 4.0)</span>
              <span>{h3Stats.totalKonturPop.toLocaleString('tr-TR')} kişi</span>
            </div>
          </div>
        </div>

        {/* Top-Right / Floating H3 Cell Inspector HUD */}
        <div className="absolute top-3 right-3 z-20 w-72 sm:w-80 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-4 transition-all">
          {inspectedCell ? (
            <div>
              {/* Top Row: H3 Index & Core/Ring Badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <Hexagon className="w-4 h-4 text-teal-700 fill-teal-100" />
                  <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
                    {inspectedCell.h3Index}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    inspectedCell.isCoreCell
                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {inspectedCell.isCoreCell ? 'Merkez Hücre' : 'Çeper Hücre'}
                </span>
              </div>

              {/* Neighborhood Name & Zone */}
              <div className="mb-3 pb-2.5 border-b border-slate-200/80">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{inspectedCell.neighborhoodName} Mahallesi</span>
                  </h4>
                  <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    Skor: {inspectedCell.vulnerabilityScore}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {inspectedCell.zoneLabel} • {inspectedCell.year} Verisi
                </p>
              </div>

              {/* Kontur Population Türkiye (HDX H3) Telemetry Banner */}
              <div className="mb-2.5 p-2.5 rounded-xl bg-sky-50/90 border border-sky-200/80 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] font-semibold text-sky-800 flex items-center gap-1">
                    <Database className="w-3 h-3 text-sky-600" />
                    <span>Kontur H3 Nüfusu (HDX)</span>
                  </div>
                  <div className="font-mono font-bold text-sky-950 mt-0.5">
                    {inspectedCell.konturPopulation.toLocaleString('tr-TR')} kişi
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-sky-700">Kontur Yoğunluk</div>
                  <div className="font-mono font-bold text-sky-900 mt-0.5">
                    {inspectedCell.konturDensityPerKm2.toLocaleString('tr-TR')} kişi/km²
                  </div>
                </div>
              </div>

              {/* Cell Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500">Hücre Kış Nüfusu</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {inspectedCell.population.toLocaleString('tr-TR')} kişi
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500">Tahmini Yaz Nüfusu</div>
                  <div className="font-mono font-bold text-indigo-700 mt-0.5">
                    {inspectedCell.summerPopEstimate.toLocaleString('tr-TR')} kişi
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500">5 Yıllık Nüfus Δ</div>
                  <div
                    className={`font-mono font-bold mt-0.5 ${
                      inspectedCell.popChange5YrPct >= 0
                        ? 'text-emerald-700'
                        : 'text-blue-700'
                    }`}
                  >
                    {inspectedCell.popChange5YrPct > 0 ? '+' : ''}
                    %{inspectedCell.popChange5YrPct}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500">65+ Yaşlı / Yapılaşma</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    %{inspectedCell.elderlyPct} / %{inspectedCell.builtUpPct}
                  </div>
                </div>
              </div>

              {/* Access Times Bar */}
              <div className="flex items-center justify-between text-[11px] bg-teal-50/70 border border-teal-200/70 rounded-xl px-3 py-2 mb-3 text-teal-950">
                <span>
                  Sağlık: <strong className="font-mono">{inspectedCell.healthAccessMin} dk</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  Eğitim: <strong className="font-mono">{inspectedCell.educationAccessMin} dk</strong>
                </span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleOpenInspectedDrawer}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition shadow-xs"
              >
                <span>Mahalle Karnesini Aç</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-center py-3">
              <Hexagon className="w-7 h-7 text-teal-600 mx-auto mb-1.5 opacity-80" />
              <div className="text-xs font-bold text-slate-800">
                H3 Altıgen Hücre Denetleyicisi
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Kontur HDX 400m nüfus yoğunluğu, kırılganlık, arazi değişimi ve erişim verilerini incelemek için haritadaki bir <strong>H3 altıgenine</strong> dokunun veya üzerine gelin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default H3MapView;
