export interface DataSourceItem {
  id: string;
  name: string;
  title: string;
  provider: string;
  scope: string;
  url: string;
  badge: string;
  updateFrequency: string;
  description: string;
}

export const OFFICIAL_DATA_SOURCES: DataSourceItem[] = [
  {
    id: 'tuik',
    name: 'TÜİK (Türkiye İstatistik Kurumu)',
    title: 'ADNKS Mahalle Nüfusları (2021–2025) & Demografik Göstergeler',
    provider: 'T.C. Hazine ve Maliye Bakanlığı — TÜİK',
    scope: '36 Kandıra mahallesinin yaş grupları (0-14, 15-64, 65+), cinsiyet, göç hızı ve nüfus dinamikleri',
    url: 'https://biruni.tuik.gov.tr/medas/',
    badge: 'ADNKS 2021–2025',
    updateFrequency: 'Yıllık Resmi İstatistik',
    description:
      'Adrese Dayalı Nüfus Kayıt Sistemi (ADNKS) kapsamında 2021-2025 yılları arasındaki resmi mahalle nüfusları, net göç hızı (‰) ve demografik yaş kırılımları temel alınmıştır.',
  },
  {
    id: 'kontur',
    name: 'HDX / Kontur Population Türkiye',
    title: '400m H3 Resolution 8 Nüfus Dağılımı & Yoğunluk Izgarası',
    provider: 'Kontur & Humanitarian Data Exchange (HDX)',
    scope: 'GHSL R2023A + Meta High Resolution Settlement Layer + Microsoft Bina İzi + OpenStreetMap',
    url: 'https://data.humdata.org/dataset/kontur-population-turkiye',
    badge: 'Kontur H3 Res 8 (400m)',
    updateFrequency: 'Global Sentinel & CBS Güncellemesi (Kasım 2023 / CC BY 4.0)',
    description:
      'Yerleşim lekeleri ve bina ayak izleri kullanılarak 400 metrelik Uber H3 Resolution 8 altıgenlerine ayrıştırılmış mikro nüfus yoğunluğu katmanı. Kırsal ve kıyı yerleşimlerin gerçek mekansal dağılımını gösterir.',
  },
  {
    id: 'osm',
    name: 'OpenStreetMap & Overpass API',
    title: 'Kandıra İdari Sınırları, Karayolları, Sağlık (ASM) ve Okul Lokasyonları',
    provider: 'OpenStreetMap Katılımcıları (ODbL) & Overpass Turbo',
    scope: 'Kandıra ilçe mülki sınırı, mahalle sınırları, karayolu ağı, aile sağlığı merkezleri (ASM) ve okullar',
    url: 'https://www.openstreetmap.org/#map=11/41.0700/30.1500',
    badge: 'CBS & İdari Sınırlar',
    updateFrequency: 'Sürekli Güncel Topluluk CBS Verisi',
    description:
      'Mülki idare sınırları, mahalle merkezleri, karayolu erişim ağları, köy yolları, ASM ve ilk/orta/lise okul koordinatları Overpass API sorguları ve CBS katmanları ile doğrulanmıştır.',
  },
  {
    id: 'kbb',
    name: 'Kocaeli Büyükşehir Belediyesi',
    title: 'Kırsal Hizmetler, Ulaşım & İmar Planı Açık Veri Portalı',
    provider: 'KBB Muhtarlık İşleri Dairesi & Ulaşım Dairesi Başkanlığı',
    scope: 'Kırsal tarım-fındık destekleri, toplu taşıma günlük sefer sayıları, içme suyu şebeke iyileştirmeleri',
    url: 'https://acikveri.kocaeli.bel.tr/',
    badge: 'KBB Açık Veri',
    updateFrequency: 'Belediye Hizmet & Faaliyet Raporları',
    description:
      'Kocaeli Büyükşehir Belediyesi Açık Veri Portalı ve Kırsal Hizmetler Dairesi verileriyle Kandıra mahallelerindeki tarımsal destekler, içme suyu şebeke durumu ve günlük otobüs seferleri entegre edilmiştir.',
  },
  {
    id: 'corine',
    name: 'CORINE / Copernicus Sentinel-2',
    title: 'Arazi Örtüsü, Orman, Fındık Tarımı ve Yapılaşma Değişimi (2021–2025)',
    provider: 'Copernicus Land Monitoring Service (CLMS) & Sentinel-2',
    scope: 'Orman, tarım/fındık alanları ve geçirimsiz yapılaşma yüzeyi 5 yıllık değişim oranları',
    url: 'https://land.copernicus.eu/',
    badge: 'CORINE / Sentinel-2',
    updateFrequency: 'Uydu Görüntüsü & Arazi Örtüsü Serisi',
    description:
      'Mahalle bazlı orman örtüsü, tarım-fındık bahçeleri ve kıyı/kentsel geçirimsiz yüzey (yapılaşma) oranları Copernicus CORINE Land Cover ve Sentinel-2 uydu indeksleriyle modellenmiştir.',
  },
  {
    id: 'sb_meb',
    name: 'Sağlık Bakanlığı & MEB',
    title: 'Aile Sağlığı Merkezleri & Taşımalı Eğitim İstatistikleri',
    provider: 'T.C. Sağlık Bakanlığı SHGM & Milli Eğitim Bakanlığı',
    scope: 'Mobil sağlık tarama periyotları, ambulans erişim dakikaları, taşımalı eğitim öğrenci sayıları',
    url: 'https://www.meb.gov.tr/',
    badge: 'Resmi Hizmet Verisi',
    updateFrequency: 'İlçe Sağlık & İlçe Milli Eğitim Müdürlükleri',
    description:
      'Sabit ASM bulunmayan köylerdeki mobil hekim ziyaret sıklıkları (ayda sefer), acil 112 ambulans varış süreleri ve köy okulları kapalı olan mahallelerdeki taşımalı eğitim öğrenci sayıları resmi planlama verileriyle modellenmiştir.',
  },
];

export interface MiniSourceLink {
  id: string;
  shortLabel: string;
  fullLabel: string;
  url: string;
  category: 'h3' | 'demografi' | 'sinir_poi' | 'yerel_cbs' | 'arazi';
}

export const MINI_SOURCE_LINKS: MiniSourceLink[] = [
  {
    id: 'kontur',
    shortLabel: 'HDX Kontur (400m H3)',
    fullLabel: 'HDX Kontur Population Türkiye (400m H3)',
    url: 'https://data.humdata.org/dataset/kontur-population-turkiye',
    category: 'h3',
  },
  {
    id: 'tuik',
    shortLabel: 'TÜİK ADNKS',
    fullLabel: 'TÜİK ADNKS (Nüfus & Demografi)',
    url: 'https://biruni.tuik.gov.tr/medas/',
    category: 'demografi',
  },
  {
    id: 'osm',
    shortLabel: 'OSM İdari Sınırlar',
    fullLabel: 'OpenStreetMap (İdari Sınırlar & POI)',
    url: 'https://www.openstreetmap.org/#map=11/41.0700/30.1500',
    category: 'sinir_poi',
  },
  {
    id: 'kbb',
    shortLabel: 'Kocaeli Açık Veri',
    fullLabel: 'Kocaeli Açık Veri / CBS Portalı',
    url: 'https://acikveri.kocaeli.bel.tr/',
    category: 'yerel_cbs',
  },
  {
    id: 'corine',
    shortLabel: 'CORINE / Sentinel-2',
    fullLabel: 'CORINE / Sentinel-2 Arazi Örtüsü',
    url: 'https://land.copernicus.eu/',
    category: 'arazi',
  },
];

