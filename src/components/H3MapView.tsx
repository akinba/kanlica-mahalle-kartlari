import React, { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
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
  Database,
  Download,
  Upload,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Filter,
  Trees,
  Wheat,
  Hexagon,
  UserCheck,
} from 'lucide-react';
import {
  H3CellProperties,
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
  | 'vulnerabilityScore'
  | 'popChange5YrPct'
  | 'elderlyPct'
  | 'builtUpPct'
  | 'builtUpChange5YrPct'
  | 'healthAccessMin'
  | 'educationAccessMin'
  | 'summerPopEstimate';

export type WebglTileStyle =
  | 'esri_gray'
  | 'osm'
  | 'esri_satellite'
  | 'opentopo'
  | 'esri_dark';

export const WEBGL_TILE_STYLES: Record<
  WebglTileStyle,
  {
    id: WebglTileStyle;
    label: string;
    bgColor: string;
    tiles: string[];
    attribution: string;
    maxzoom?: number;
  }
> = {
  esri_gray: {
    id: 'esri_gray',
    label: 'Açık Gri Altlık',
    bgColor: '#e2e8f0',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '© Esri, DeLorme, NAVTEQ',
    maxzoom: 16,
  },
  osm: {
    id: 'osm',
    label: 'OSM Standart',
    bgColor: '#e2e8f0',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors',
    maxzoom: 19,
  },
  esri_satellite: {
    id: 'esri_satellite',
    label: 'Uydu (Esri Satellite)',
    bgColor: '#0b1526',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '© Esri, Maxar, Earthstar Geographics',
    maxzoom: 19,
  },
  opentopo: {
    id: 'opentopo',
    label: 'Topografik Arazi (OpenTopo)',
    bgColor: '#e5e7eb',
    tiles: [
      'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
      'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
    ],
    attribution: '© OpenTopoMap, © OpenStreetMap contributors',
    maxzoom: 17,
  },
  esri_dark: {
    id: 'esri_dark',
    label: 'Koyu Gri Altlık',
    bgColor: '#0f172a',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '© Esri, DeLorme, NAVTEQ',
    maxzoom: 16,
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
      'HDX Kontur Population Türkiye (GHSL + HRSL + Microsoft Bina + OSM) 400m H3 altıgen nüfus dağılımı',
    icon: <Database className="w-3.5 h-3.5" />,
    stops: [
      { value: 15, color: '#0ea5e9', label: 'Seyrek (<20)' },
      { value: 120, color: '#10b981', label: 'Orta (120)' },
      { value: 450, color: '#f59e0b', label: 'Yoğun (450)' },
      { value: 1400, color: '#e11d48', label: 'Merkez (1.400+)' },
    ],
    formatValue: (v) => `${Math.round(v).toLocaleString('tr-TR')} kişi`,
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
  builtUpPct: {
    id: 'builtUpPct',
    label: 'Yapılaşma & Geçirimsiz Alan Payı (%)',
    shortLabel: 'Yapılaşma (%)',
    unit: '%',
    description: 'H3 altıgen hücresindeki konut, ticari ve geçirimsiz yüzey oranı',
    icon: <Building2 className="w-3.5 h-3.5" />,
    stops: [
      { value: 6, color: '#10b981', label: 'Doğal/Kırsal (<%8)' },
      { value: 18, color: '#eab308', label: 'Ilımlı (%18)' },
      { value: 35, color: '#f97316', label: 'Yoğun (%35)' },
      { value: 65, color: '#dc2626', label: 'Kentsel/Kıyı Baskısı (%65+)' },
    ],
    formatValue: (v) => `%${v.toFixed(1)}`,
  },
  builtUpChange5YrPct: {
    id: 'builtUpChange5YrPct',
    label: 'Yapılaşma Artışı (5 Yıl %)',
    shortLabel: 'Yapılaşma Δ (5 Yıl)',
    unit: '%',
    description: '2021–2025 arası konut ve geçirimsiz yüzey artış oranı',
    icon: <Building2 className="w-3.5 h-3.5" />,
    stops: [
      { value: 5, color: '#10b981', label: 'Korunan (<%8)' },
      { value: 18, color: '#eab308', label: 'Ilımlı (%18)' },
      { value: 35, color: '#f97316', label: 'Yoğun (%35)' },
      { value: 65, color: '#dc2626', label: 'Hızlı (%65+)' },
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

function parseCellProperties(props: Record<string, unknown>): H3CellProperties {
  let neighborhoodNames: string[] = [];
  if (Array.isArray(props.neighborhoodNames)) {
    neighborhoodNames = props.neighborhoodNames as string[];
  } else if (typeof props.neighborhoodNames === 'string') {
    try {
      neighborhoodNames = JSON.parse(props.neighborhoodNames);
    } catch {
      neighborhoodNames = [String(props.neighborhoodNames)];
    }
  } else if (props.neighborhoodName) {
    neighborhoodNames = [String(props.neighborhoodName)];
  }

  let zones: string[] = [];
  if (Array.isArray(props.zones)) {
    zones = props.zones as string[];
  } else if (typeof props.zones === 'string') {
    try {
      zones = JSON.parse(props.zones);
    } catch {
      zones = [String(props.zones)];
    }
  } else if (props.zone) {
    zones = [String(props.zone)];
  }

  const primaryNeighborhood = String(
    props.primaryNeighborhood || props.neighborhoodName || ''
  );

  return {
    fid: Number(props.fid || 0),
    h3: String(props.h3 || props.h3Index || ''),
    h3Index: String(props.h3Index || props.h3 || ''),
    neighborhoodId: String(props.neighborhoodId || ''),
    neighborhoodName: String(props.neighborhoodName || primaryNeighborhood),
    primaryNeighborhood,
    neighborhoodNames: neighborhoodNames.length > 0 ? neighborhoodNames : [primaryNeighborhood],
    zone: (props.zone as any) || 'merkez',
    zoneLabel: String(props.zoneLabel || ''),
    zones: zones.length > 0 ? zones : [(props.zone as any) || 'merkez'],
    year: (Number(props.year || 2025) as SurveyYear),
    population: Number(props.population || props.totalPopulation || 0),
    totalPopulation: Number(props.totalPopulation || props.population || 0),
    konturPopulation: Number(props.konturPopulation || 0),
    konturDensityPerKm2: Number(props.konturDensityPerKm2 || 0),
    konturPopulationDensity: Number(
      props.konturPopulationDensity ?? props.konturDensityPerKm2 ?? 0
    ),
    popChange5YrPct: Number(props.popChange5YrPct || 0),
    elderlyPct: Number(props.elderlyPct || 0),
    youthPct: Number(props.youthPct || 0),
    vulnerabilityScore: Number(props.vulnerabilityScore || 0),
    builtUpPct: Number(props.builtUpPct || 0),
    builtUpChange5YrPct: Number(props.builtUpChange5YrPct || 0),
    forestPct: Number(props.forestPct || 0),
    agriculturePct: Number(props.agriculturePct || 0),
    healthAccessMin: Number(props.healthAccessMin || 0),
    educationAccessMin: Number(props.educationAccessMin || 0),
    summerPopEstimate: Number(props.summerPopEstimate || 0),
    seasonalWorkersEst: Number(props.seasonalWorkersEst || 0),
    socialAidHouseholdsEst: Number(props.socialAidHouseholdsEst || 0),
    isCoreCell: Boolean(props.isCoreCell),
    dataSource: props.dataSource as any,
  };
}

export const H3MapView: React.FC<H3MapViewProps> = ({
  neighborhoods,
  selectedYear,
  weights,
  selectedNeighborhood,
  onSelectNeighborhood,
  onOpenDetailDrawer,
}) => {
  const [activeLayer, setActiveLayer] = useState<H3ThematicLayer>('konturPopulation');
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [tileStyle, setTileStyle] = useState<WebglTileStyle>('esri_gray');

  // Kontur resolution (defaults to 8: 400m H3 micro grid)
  const [resolution, setResolution] = useState<7 | 8>(8);
  // Pure 2D top-down view ("2B görünürlük yeterli, 3B ye gerek yok")
  const [is3D, setIs3D] = useState<boolean>(false);

  // Filter H3 cells by neighborhood (border cells with matching neighborhood in neighborhoodNames array are included!)
  const [selectedMahalleFilter, setSelectedMahalleFilter] = useState<string>('all');

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

  // Hovered or clicked cell state for telemetry inspector HUD
  const [hoveredCell, setHoveredCell] = useState<H3CellProperties | null>(null);
  const [clickedCell, setClickedCell] = useState<H3CellProperties | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const tooltipRef = useRef<maplibregl.Popup | null>(null);

  // Generate full Kontur 400m (Res-8) H3 GeoJSON FeatureCollection across Kandıra
  const h3GeoJSON = useMemo(() => {
    return generateKandiraH3GeoJSON(
      neighborhoods,
      selectedYear,
      resolution, // Resolution 8: 400m Kontur H3 Hexagon (or Res 7 macro)
      weights,
      'kontur_full', // Base spatial foundation across entire Kandıra
      customKonturMap
    );
  }, [neighborhoods, selectedYear, resolution, weights, customKonturMap]);

  // Filtered H3 cells based on selectedMahalleFilter
  // Border hexagons overlapping multiple neighborhoods have neighborhoodNames: string[]
  // and are included whenever any of their constituent neighborhoods is selected!
  const displayedH3GeoJSON = useMemo(() => {
    if (selectedMahalleFilter === 'all') {
      return h3GeoJSON;
    }
    return {
      type: 'FeatureCollection' as const,
      features: h3GeoJSON.features.filter((f) => {
        const names = f.properties.neighborhoodNames || [f.properties.neighborhoodName];
        return names.includes(selectedMahalleFilter);
      }),
    };
  }, [h3GeoJSON, selectedMahalleFilter]);

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
          isSelected:
            selectedNeighborhood?.id === n.id ||
            selectedMahalleFilter === n.name,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: n.coordinates,
        },
      })),
    };
  }, [neighborhoods, selectedNeighborhood, selectedMahalleFilter]);

  // Compute summary stats for legend & telemetry
  const h3Stats = useMemo(() => {
    const features = displayedH3GeoJSON.features;
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
      borderCells: totalCells - coreCells,
      avgVal: totalCells > 0 ? sumMetric / totalCells : 0,
      totalKonturPop: sumKonturPop,
      minVal: minVal === Infinity ? 0 : minVal,
      maxVal: maxVal === -Infinity ? 0 : maxVal,
    };
  }, [displayedH3GeoJSON, activeLayer]);

  // Active inspected cell: hoveredCell -> clickedCell -> selectedNeighborhood's core cell
  const inspectedCell = useMemo<H3CellProperties | null>(() => {
    if (hoveredCell) return hoveredCell;
    if (clickedCell) return clickedCell;
    if (selectedNeighborhood) {
      const found = h3GeoJSON.features.find(
        (f) =>
          (f.properties.neighborhoodId === selectedNeighborhood.id ||
            f.properties.neighborhoodName === selectedNeighborhood.name) &&
          f.properties.isCoreCell
      );
      if (found) return found.properties;
    }
    return h3GeoJSON.features[0]?.properties || null;
  }, [hoveredCell, clickedCell, selectedNeighborhood, h3GeoJSON]);

  // Initialize WebGL MapLibre GL instance in pure 2D mode (pitch: 0, no 3D extrusion)
  useEffect(() => {
    if (!mapContainerRef.current) return;

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
              maxzoom: activeTileCfg.maxzoom ?? 19,
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
              maxzoom: activeTileCfg.maxzoom ?? 19,
            },
          ],
        },
        center: [30.185, 41.078],
        zoom: 10.3,
        pitch: 0, // 2D top-down view (no 3D tilt)
        bearing: 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        failIfMajorPerformanceCaveat: false,
      });

      mapInstanceRef.current = map;

      // Cursor popup tooltip
      tooltipRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
      });

      map.on('load', () => {
        if (!map) return;

        // Add 2D H3 GeoJSON Source
        map.addSource('kandira-h3', {
          type: 'geojson',
          data: displayedH3GeoJSON as unknown as GeoJSON.FeatureCollection,
        });

        // 2D Polygon Fill Layer
        map.addLayer({
          id: 'h3-fill',
          type: 'fill',
          source: 'kandira-h3',
          paint: {
            'fill-color': buildColorExpression(activeLayer),
            'fill-opacity': 0.82,
          },
        });

        // 2D Hexagon Outline Layer
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
              0.8,
            ],
            'line-opacity': 0.82,
          },
        });

        // Add neighborhood pins & labels
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

        // Hover events on 2D H3 fill
        map.on('mousemove', 'h3-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          map!.getCanvas().style.cursor = 'pointer';
          const rawProps = e.features[0].properties as Record<string, unknown>;
          const parsed = parseCellProperties(rawProps);
          setHoveredCell(parsed);

          // Fast cursor tooltip
          const coord = e.lngLat;
          const metricVal = parsed[activeLayer];
          const formattedVal = LAYER_CONFIGS[activeLayer].formatValue(
            Number(metricVal ?? 0)
          );
          const namesStr = parsed.neighborhoodNames.join(', ');

          if (tooltipRef.current) {
            tooltipRef.current
              .setLngLat(coord)
              .setHTML(
                `<div style="font-family:sans-serif; font-size:11px; padding:3px 6px; color:#0f172a;">` +
                  `<strong>${parsed.primaryNeighborhood}</strong>` +
                  (parsed.neighborhoodNames.length > 1
                    ? `<div style="font-size:9.5px; color:#64748b; margin-top:1px;">Sınır Altıgeni: ${namesStr}</div>`
                    : '') +
                  `<div style="font-size:10.5px; font-weight:700; color:#0284c7; margin-top:2px;">` +
                  `${LAYER_CONFIGS[activeLayer].shortLabel}: ${formattedVal}` +
                  `</div>` +
                  `</div>`
              )
              .addTo(map!);
          }
        });

        map.on('mouseleave', 'h3-fill', () => {
          if (!map) return;
          map.getCanvas().style.cursor = '';
          setHoveredCell(null);
          if (tooltipRef.current) {
            tooltipRef.current.remove();
          }
        });

        // Click to pin/inspect cell & select neighborhood
        map.on('click', 'h3-fill', (e) => {
          if (!e.features || e.features.length === 0) return;
          const rawProps = e.features[0].properties as Record<string, unknown>;
          const parsed = parseCellProperties(rawProps);
          setClickedCell(parsed);
          const matched = neighborhoods.find(
            (n) =>
              n.id === parsed.neighborhoodId ||
              n.name === parsed.primaryNeighborhood
          );
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
            setSelectedMahalleFilter(matched.name);
          }
        });
      });

      map.on('error', () => {
        // Safe fallback in restricted sandboxes
      });
    } catch {
      // MapLibre init fallback
    }

    return () => {
      if (tooltipRef.current) {
        tooltipRef.current.remove();
      }
      if (map) {
        map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [tileStyle]);

  // Synchronize GeoJSON data & 2D paint expressions when props/filters change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const source = map.getSource('kandira-h3') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(displayedH3GeoJSON as unknown as GeoJSON.FeatureCollection);
    }

    const pinsSource = map.getSource('kandira-neighborhood-pins') as
      | maplibregl.GeoJSONSource
      | undefined;
    if (pinsSource) {
      pinsSource.setData(neighborhoodPinsGeoJSON as unknown as GeoJSON.FeatureCollection);
    }

    if (map.getLayer('h3-fill')) {
      map.setPaintProperty('h3-fill', 'fill-color', buildColorExpression(activeLayer));
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
  }, [displayedH3GeoJSON, neighborhoodPinsGeoJSON, activeLayer, showLabels]);

  // Fly to selected neighborhood when filter or prop changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedMahalleFilter !== 'all') {
      const target = neighborhoods.find((n) => n.name === selectedMahalleFilter);
      if (target) {
        map.flyTo({
          center: target.coordinates,
          zoom: 11.8,
          duration: 600,
        });
      }
    } else if (selectedNeighborhood) {
      map.flyTo({
        center: selectedNeighborhood.coordinates,
        zoom: 11.4,
        duration: 600,
      });
    }
  }, [selectedMahalleFilter, selectedNeighborhood, neighborhoods]);

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
    a.download = `kandira_kontur_population_400m_h3_res8_${selectedYear}.geojson`;
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
      const parsed = parseKonturH3GeoJSON(text, 8);
      if (parsed.cellCount > 0) {
        setCustomKonturMap(parsed.map);
        setCustomKonturInfo({
          fileName: file.name,
          cellCount: parsed.cellCount,
          totalPopulation: parsed.totalPopulation,
        });
        setActiveLayer('konturPopulation');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenInspectedDrawer = () => {
    if (!inspectedCell) return;
    const found = neighborhoods.find(
      (n) =>
        n.id === inspectedCell.neighborhoodId ||
        n.name === inspectedCell.primaryNeighborhood
    );
    if (found) {
      onOpenDetailDrawer(found);
    }
  };

  const handleResetMapCamera = () => {
    setSelectedMahalleFilter('all');
    setHoveredCell(null);
    setClickedCell(null);
    mapInstanceRef.current?.flyTo({
      center: [30.185, 41.078],
      zoom: 10.3,
      duration: 500,
    });
  };

  return (
    <div className="relative bg-slate-900 rounded-2xl border border-slate-200/90 shadow-md overflow-hidden flex flex-col">
      {/* Top 2D WebGL Map Control Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex flex-col gap-2.5 z-20">
        {/* Row 1: Thematic Metric Column Switcher Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-sky-600" />
              Aktif Kolon / Katman:
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

          {/* Right: Base Grid Badge, Resolution Switcher & Labels Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setResolution(7)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition ${
                  resolution === 7
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="H3 Çözünürlük 7 (~5.16 km² Makro Havza Altıgeni)"
              >
                Res 7
              </button>
              <button
                type="button"
                onClick={() => setResolution(8)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition ${
                  resolution === 8
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="H3 Çözünürlük 8 (~0.73 km² Kontur 400m Mikro Altıgeni)"
              >
                Res 8 (400m)
              </button>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold bg-sky-50 text-sky-800 border border-sky-200">
              <Hexagon className="w-3.5 h-3.5 text-sky-600" />
              <span>Kontur 400m H3 Temel Izgara</span>
            </span>

            <button
              type="button"
              onClick={() => setShowLabels((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              title="Mahalle Etiketlerini Göster/Gizle"
            >
              {showLabels ? (
                <Eye className="w-3.5 h-3.5 text-sky-600" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden sm:inline">Etiketler</span>
            </button>
          </div>
        </div>

        {/* Row 2: Mahalle Filter (Including Border Hexagons), Kontur GeoJSON Tools & Tile Styles */}
        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          {/* Left: Mahalle Filter Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              <span className="text-[11px] font-bold text-slate-600">Mahalle Filtresi:</span>
              <select
                value={selectedMahalleFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMahalleFilter(val);
                  if (val !== 'all') {
                    const found = neighborhoods.find((n) => n.name === val);
                    if (found) {
                      onSelectNeighborhood(found);
                    }
                  }
                }}
                aria-label="Haritada Mahalle Filtrele (Sınır Altıgenler Dahil)"
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="all">
                  Tüm Kandıra ({neighborhoods.length} Mahalle — Tüm Altıgenler)
                </option>
                {neighborhoods.map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.name} Mahallesi
                  </option>
                ))}
              </select>

              {selectedMahalleFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedMahalleFilter('all')}
                  className="text-[11px] font-bold text-sky-600 hover:text-sky-800 underline ml-1"
                >
                  Filtreyi Kaldır
                </button>
              )}
            </div>

            {selectedMahalleFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>
                  {selectedMahalleFilter}: {displayedH3GeoJSON.features.length} H3 altıgeni (sınır hücreleri dahil)
                </span>
              </span>
            )}

            {/* GeoJSON Export & Import */}
            <button
              type="button"
              onClick={handleExportKonturGeoJSON}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100 transition"
              title="Kandıra Kontur 400m H3 verilerini GeoJSON olarak indir"
            >
              <Download className="w-3 h-3" />
              <span>Kontur GeoJSON İndir</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition"
              title="Kontur Population Türkiye GeoJSON dosyası yükle"
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span>{customKonturInfo.fileName} yüklendi</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomKonturMap(undefined);
                    setCustomKonturInfo(null);
                  }}
                  className="underline ml-1"
                >
                  Sıfırla
                </button>
              </span>
            )}
          </div>

          {/* Right: Keyless Basemap Tile Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
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

            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>2B WebGL Harita</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main MapLibre GL 2D Canvas Viewport */}
      <div className="relative w-full h-[580px] lg:h-[640px] bg-[#0f172a] overflow-hidden select-none">
        {/* Pure WebGL MapLibre Canvas */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Top-Left Navigation Controls (Zoom In, Zoom Out, Reset Camera) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-1 flex flex-col gap-1 shadow-lg text-slate-700">
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition"
              title="Yakınlaştır"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition"
              title="Uzaklaştır"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetMapCamera}
              className="p-2 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition border-t border-slate-100"
              title="Görünümü ve Filtreyi Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom-Left 2D Choropleth Legend & Telemetry Summary */}
        <div className="absolute bottom-3 left-3 z-20 max-w-xs sm:max-w-sm bg-slate-900/92 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 text-white shadow-xl">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Hexagon className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
              <span>{currentLayerConfig.label}</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
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
                Gösterilen: <strong className="text-white">{h3Stats.totalCells}</strong> H3 Hücre
              </span>
              <span>
                Merkez: <strong className="text-sky-300">{h3Stats.coreCells}</strong> • Sınır/Çeper:{' '}
                <strong className="text-slate-200">{h3Stats.borderCells}</strong>
              </span>
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-sky-300/90">
              <span>Kontur HDX 400m Nüfus:</span>
              <strong className="text-white">
                {h3Stats.totalKonturPop.toLocaleString('tr-TR')} kişi
              </strong>
            </div>
          </div>
        </div>

        {/* Top-Right Floating H3 Cell Inspector HUD (Full Tabular Column Record) */}
        <div className="absolute top-3 right-3 z-20 w-80 sm:w-96 max-h-[92%] overflow-y-auto bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl p-4 transition-all">
          {inspectedCell ? (
            <div className="space-y-3">
              {/* Top Row: H3 Res-8 Index & Core / Border Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Hexagon className="w-4 h-4 text-sky-600 fill-sky-100 shrink-0" />
                  <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
                    {inspectedCell.h3Index}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    inspectedCell.isCoreCell
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {inspectedCell.isCoreCell ? 'Merkez Hücresi' : 'Sınır / Çeper Hücresi'}
                </span>
              </div>

              {/* Overlapping Neighborhoods Array Banner (Key Requirement) */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-sky-600" />
                    Kapsanan / Sınır Mahalleler:
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {inspectedCell.neighborhoodNames.length} Mahalle
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {inspectedCell.neighborhoodNames.map((name) => {
                    const isPrimary = name === inspectedCell.primaryNeighborhood;
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          const matched = neighborhoods.find((n) => n.name === name);
                          if (matched) {
                            onSelectNeighborhood(matched);
                            setSelectedMahalleFilter(name);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold border transition ${
                          isPrimary
                            ? 'bg-sky-600 text-white border-sky-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                        title={`${name} mahallesini filtrele`}
                      >
                        <span>{name}</span>
                        {isPrimary && (
                          <span className="text-[9px] bg-sky-700/80 px-1 rounded text-sky-100">
                            Esas
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Primary Neighborhood & Vulnerability Score */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {inspectedCell.primaryNeighborhood} Mahallesi
                  </h4>
                  <div className="text-[11px] text-slate-500">
                    {inspectedCell.zoneLabel} • {inspectedCell.year} Verisi
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-semibold">Kırılganlık</div>
                  <span className="text-sm font-mono font-extrabold text-rose-600">
                    {inspectedCell.vulnerabilityScore} / 100
                  </span>
                </div>
              </div>

              {/* Kontur Population HDX 400m Grid Metrics Banner */}
              <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between text-xs">
                <div>
                  <div className="text-[10px] font-bold text-sky-800 flex items-center gap-1">
                    <Database className="w-3 h-3 text-sky-600" />
                    <span>Kontur 400m Nüfusu</span>
                  </div>
                  <div className="font-mono font-extrabold text-sky-950 mt-0.5 text-base">
                    {inspectedCell.konturPopulation.toLocaleString('tr-TR')} kişi
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-sky-700">Kontur Yoğunluk</div>
                  <div className="font-mono font-bold text-sky-900 mt-0.5">
                    {inspectedCell.konturDensityPerKm2.toLocaleString('tr-TR')} kişi/km²
                  </div>
                </div>
              </div>

              {/* Tabular Enriched Columns Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium">Toplam Nüfus</div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {inspectedCell.totalPopulation.toLocaleString('tr-TR')} kişi
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium">Yaz Tepe Nüfusu</div>
                  <div className="font-mono font-bold text-amber-700 mt-0.5">
                    {inspectedCell.summerPopEstimate.toLocaleString('tr-TR')} kişi
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium">5 Yıllık Nüfus Δ</div>
                  <div
                    className={`font-mono font-bold mt-0.5 ${
                      inspectedCell.popChange5YrPct >= 0
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {inspectedCell.popChange5YrPct > 0 ? '+' : ''}%{inspectedCell.popChange5YrPct}
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium">65+ Yaşlı / 0-14 Genç</div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    %{inspectedCell.elderlyPct} / %{inspectedCell.youthPct}
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>Yapılaşma Oranı</span>
                  </div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    %{inspectedCell.builtUpPct}
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <Trees className="w-3 h-3 text-emerald-600" />
                    <span>Orman / Tarım</span>
                  </div>
                  <div className="font-mono font-bold text-slate-800 mt-0.5">
                    %{inspectedCell.forestPct} / %{inspectedCell.agriculturePct}
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <HeartPulse className="w-3 h-3 text-rose-500" />
                    <span>Sağlık Erişimi</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {inspectedCell.healthAccessMin} dk
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-sky-600" />
                    <span>Eğitim Erişimi</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {inspectedCell.educationAccessMin} dk
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <Wheat className="w-3 h-3 text-amber-600" />
                    <span>Mevsimlik İşçi (Tah.)</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    ~{inspectedCell.seasonalWorkersEst} kişi
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/70">
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-indigo-600" />
                    <span>Sosyal Yardım (Tah.)</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    ~{inspectedCell.socialAidHouseholdsEst} hane
                  </div>
                </div>
              </div>

              {/* Action Button: Open Detail Drawer */}
              <button
                type="button"
                onClick={handleOpenInspectedDrawer}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition shadow-sm"
              >
                <span>{inspectedCell.primaryNeighborhood} Mahalle Karnesini Aç</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Hexagon className="w-7 h-7 text-sky-600 mx-auto mb-1.5 opacity-80" />
              <div className="text-xs font-bold text-slate-800">
                H3 Altıgen Hücre Denetleyicisi
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Kontur 400m nüfus yoğunluğu, sınır mahalleler ve zenginleştirilmiş kolon verilerini incelemek için haritadaki bir <strong>H3 altıgenine</strong> dokunun veya üzerine gelin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default H3MapView;
