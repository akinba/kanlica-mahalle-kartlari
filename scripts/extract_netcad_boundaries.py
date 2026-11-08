import os
import sys
import json
from shapely.geometry import Polygon, MultiPolygon, mapping, shape
from shapely.ops import transform
from pyproj import Transformer

sys.path.insert(0, '/tmp/jeomatik_reader')
from ncz_pure import parse_ncz

NCZ_PATH = '/tmp/ncz_extracted/Tüm_Kocaeli_İdari_Sınır(17082022).NCZ'
TARGET_DIR = '/home/antigravity/akinba/kanlica-mahalle-kartlari/src/data/geo'
OSM_ADMIN8_PATH = os.path.join(TARGET_DIR, 'kandira_neighborhoods_admin8.geojson')

# Coordinate transformer: EPSG:5254 (ITRF96 / TM30) -> EPSG:4326 (WGS84 [lng, lat])
transformer = Transformer.from_crs('EPSG:5254', 'EPSG:4326', always_xy=True)

# Standard Mahalle Name Mapping for the 96 NetCAD Polygons
NETCAD_LABEL_TO_MAHALLE = {
    'AHMETHACIL': {'name': 'Ahmethacılar Mahallesi', 'short_name': 'Ahmethacılar'},
    'AKBAL_MAH': {'name': 'Akbal Mahallesi', 'short_name': 'Akbal'},
    'AKDURAK': {'name': 'Akdurak Mahallesi', 'short_name': 'Akdurak'},
    'AKINCI': {'name': 'Akıncı Mahallesi', 'short_name': 'Akıncı'},
    'AKÇABEYLI': {'name': 'Akçabeyli Mahallesi', 'short_name': 'Akçabeyli'},
    'AKÇAGİL': {'name': 'Ağaçağıl Mahallesi', 'short_name': 'Ağaçağıl'},
    'AKÇAKESE': {'name': 'Akçakese Mahallesi', 'short_name': 'Akçakese'},
    'AKÇAOVA': {'name': 'Akçaova Mahallesi', 'short_name': 'Akçaova'},
    'ALEFLİ': {'name': 'Alefli Mahallesi', 'short_name': 'Alefli'},
    'ANTAPLI': {'name': 'Antaplı Mahallesi', 'short_name': 'Antaplı'},
    'ARAMAN(KAY': {'name': 'Kaymaz Mahallesi', 'short_name': 'Kaymaz'},
    'AVDAN': {'name': 'Avdan Mahallesi', 'short_name': 'Avdan'},
    'AYDıNLıK': {'name': 'Aydınlık Mahallesi', 'short_name': 'Aydınlık'},
    'BABAKÖY': {'name': 'Babaköy Mahallesi', 'short_name': 'Babaköy'},
    'BABALI': {'name': 'Babalı Mahallesi', 'short_name': 'Babalı'},
    'BALABAN': {'name': 'Balaban Mahallesi', 'short_name': 'Balaban'},
    'BALCI': {'name': 'Balcı Mahallesi', 'short_name': 'Balcı'},
    'BALLAR': {'name': 'Ballar Mahallesi', 'short_name': 'Ballar'},
    'BAĞIRKANLI': {'name': 'Bağırganlı Mahallesi', 'short_name': 'Bağırganlı'},
    'BEYCE': {'name': 'Beyce Mahallesi', 'short_name': 'Beyce'},
    'BEYLERBEYİ': {'name': 'Beylerbeyi Mahallesi', 'short_name': 'Beylerbeyi'},
    'BOLLU': {'name': 'Bolu Mahallesi', 'short_name': 'Bolu'},
    'BOZBURUN': {'name': 'Bozburun Mahallesi', 'short_name': 'Bozburun'},
    'CEBECİ': {'name': 'Cebeci Mahallesi', 'short_name': 'Cebeci'},
    'DALCA': {'name': 'Dalca Mahallesi', 'short_name': 'Dalca'},
    'DELİVELİ': {'name': 'Deliveli Mahallesi', 'short_name': 'Deliveli'},
    'DOĞANCILI': {'name': 'Doğancılı Mahallesi', 'short_name': 'Doğancılı'},
    'DURAKLI': {'name': 'Duraklı Mahallesi', 'short_name': 'Duraklı'},
    'DURAÇALI': {'name': 'Alaybey Mahallesi', 'short_name': 'Alaybey'},
    'DÖNGELLİ': {'name': 'Döngelli Mahallesi', 'short_name': 'Döngelli'},
    'ELMACIK': {'name': 'Elmacık Mahallesi', 'short_name': 'Elmacık'},
    'ERİKLİ': {'name': 'Merkez Erikli Mahallesi', 'short_name': 'Merkez Erikli'},
    'ERİKLİ(KAY': {'name': 'Kaymaz Erikli Mahallesi', 'short_name': 'Kaymaz Erikli'},
    'ESENTEPE': {'name': 'Esentepe Mahallesi', 'short_name': 'Esentepe'},
    'EĞERCİLİ': {'name': 'Eğercili Mahallesi', 'short_name': 'Eğercili'},
    'FERİZLİ': {'name': 'Ferizli Mahallesi', 'short_name': 'Ferizli'},
    'GEBEŞLER': {'name': 'Gebeşler Mahallesi', 'short_name': 'Gebeşler'},
    'GONCAAYDIN': {'name': 'Goncaaydın Mahallesi', 'short_name': 'Goncaaydın'},
    'HACILAR': {'name': 'Hacılar Mahallesi', 'short_name': 'Hacılar'},
    'HACIMAZLI': {'name': 'Hacımazlı Mahallesi', 'short_name': 'Hacımazlı'},
    'HACIŞEYH': {'name': 'Hacışeyh Mahallesi', 'short_name': 'Hacışeyh'},
    'HIDIRLAR': {'name': 'Hıdırlar Mahallesi', 'short_name': 'Hıdırlar'},
    'HÜDAVERDİL': {'name': 'Hüdaverdiler Mahallesi', 'short_name': 'Hüdaverdiler'},
    'KABAAĞAÇ': {'name': 'Kabaağaç Mahallesi', 'short_name': 'Kabaağaç'},
    'KANATLAR': {'name': 'Kanatlar Mahallesi', 'short_name': 'Kanatlar'},
    'KARAAGAC': {'name': 'Karaağaç Mahallesi', 'short_name': 'Karaağaç'},
    'KARADİVAN': {'name': 'Karadivan Mahallesi', 'short_name': 'Karadivan'},
    'KARLI': {'name': 'Karlı Mahallesi', 'short_name': 'Karlı'},
    'KEFKEN': {'name': 'Kefken Mahallesi', 'short_name': 'Kefken'},
    'KINCILLI': {'name': 'Kerpe Mahallesi', 'short_name': 'Kerpe'},
    'KIRKARMUT': {'name': 'Kırkarmut Mahallesi', 'short_name': 'Kırkarmut'},
    'KIZILCAPIN': {'name': 'Kızılcapınar Mahallesi', 'short_name': 'Kızılcapınar'},
    'KOCAKAYMAZ': {'name': 'Kocakaymas Mahallesi', 'short_name': 'Kocakaymas'},
    'KUBUZCU': {'name': 'Kubuzcu Mahallesi', 'short_name': 'Kubuzcu'},
    'KURTYERİ': {'name': 'Kurtyeri Mahallesi', 'short_name': 'Kurtyeri'},
    'LOKMANLI': {'name': 'Lokmanlı Mahallesi', 'short_name': 'Lokmanlı'},
    'MANCARLAR': {'name': 'Mancarlar Mahallesi', 'short_name': 'Mancarlar'},
    'MÜLKŞEYHSU': {'name': 'Mülküşehsuvar Mahallesi', 'short_name': 'Mülküşehsuvar'},
    'NASUHLAR': {'name': 'Nasuhlar Mahallesi', 'short_name': 'Nasuhlar'},
    'ORHAN_MAH': {'name': 'Orhan Mahallesi', 'short_name': 'Orhan'},
    'PELİTPINAR': {'name': 'Pelitpınarı Mahallesi', 'short_name': 'Pelitpınarı'},
    'PINARDÜZÜ': {'name': 'Pınardüzü Mahallesi', 'short_name': 'Pınardüzü'},
    'PINARLI': {'name': 'Pınarlı Mahallesi', 'short_name': 'Pınarlı'},
    'PİRCELER': {'name': 'Pirceler Mahallesi', 'short_name': 'Pirceler'},
    'SAFALI': {'name': 'Safalı Mahallesi', 'short_name': 'Safalı'},
    'SARIAHMETL': {'name': 'Sarıahmetler Mahallesi', 'short_name': 'Sarıahmetler'},
    'SARICAALİ': {'name': 'Sarıcaali Mahallesi', 'short_name': 'Sarıcaali'},
    'SARIGAZİ': {'name': 'Sarıgazi Mahallesi', 'short_name': 'Sarıgazi'},
    'SARNIÇLAR': {'name': 'Sarnıçlar Mahallesi', 'short_name': 'Sarnıçlar'},
    'SELAMETLİ': {'name': 'Selametli Mahallesi', 'short_name': 'Selametli'},
    'SELİMKÖY': {'name': 'Selimköy Mahallesi', 'short_name': 'Selimköy'},
    'SEPETÇİ': {'name': 'Sepetçi Mahallesi', 'short_name': 'Sepetçi'},
    'SEYİTALİLE': {'name': 'Seyitaliler Mahallesi', 'short_name': 'Seyitaliler'},
    'SUCUALİ': {'name': 'Sucuali Mahallesi', 'short_name': 'Sucuali'},
    'SÜLLÜ': {'name': 'Süllü Mahallesi', 'short_name': 'Süllü'},
    'SİNANLIBİL': {'name': 'Sinanlıbilalli Mahallesi', 'short_name': 'Sinanlıbilalli'},
    'TATARAHMET': {'name': 'Tatarahmet Mahallesi', 'short_name': 'Tatarahmet'},
    'TEKSEN': {'name': 'Teksen Mahallesi', 'short_name': 'Teksen'},
    'TERZİLER': {'name': 'Terziler Mahallesi', 'short_name': 'Terziler'},
    'TOPLUCA': {'name': 'Topluca Mahallesi', 'short_name': 'Topluca'},
    'X': {'name': 'Hediyeli Mahallesi', 'short_name': 'Hediyeli'},
    'YAĞCILAR': {'name': 'Yağcılar Mahallesi', 'short_name': 'Yağcılar'},
    'YUSUFCA': {'name': 'Yusufça Mahallesi', 'short_name': 'Yusufça'},
    'ÇAKIRCAALİ': {'name': 'Çakırcaali Mahallesi', 'short_name': 'Çakırcaali'},
    'ÇAKMAKLAR': {'name': 'Çakmaklar Mahallesi', 'short_name': 'Çakmaklar'},
    'ÇALCA': {'name': 'Çalca Mahallesi', 'short_name': 'Çalca'},
    'ÇALKÖY': {'name': 'Çalköy Mahallesi', 'short_name': 'Çalköy'},
    'ÇALYER': {'name': 'Çalyer Mahallesi', 'short_name': 'Çalyer'},
    'ÇAMKONAK': {'name': 'Çamkonak Mahallesi', 'short_name': 'Çamkonak'},
    'ÇARŞı': {'name': 'Çarşı Mahallesi', 'short_name': 'Çarşı'},
    'ÇERÇİLİ': {'name': 'Çerçili Mahallesi', 'short_name': 'Çerçili'},
    'ÖMERLİ': {'name': 'Ömerli Mahallesi', 'short_name': 'Ömerli'},
    'ÖZBEY': {'name': 'Özbey Mahallesi', 'short_name': 'Özbey'},
    'ÜĞÜMCE': {'name': 'Üğümce Mahallesi', 'short_name': 'Üğümce'},
    'İNCECİK': {'name': 'İncecik Mahallesi', 'short_name': 'İncecik'},
    'ŞEREFSUNGU': {'name': 'Şerefsungur Mahallesi', 'short_name': 'Şerefsungur'},
}

def round_coords(geom_dict, precision=6):
    def r(coords):
        if isinstance(coords[0], (int, float)):
            return [round(coords[0], precision), round(coords[1], precision)]
        return [r(c) for c in coords]
    geom_dict['coordinates'] = r(geom_dict['coordinates'])
    return geom_dict

def main():
    print("1. Parsing Netcad NCZ...")
    res = parse_ncz(NCZ_PATH)
    print(f"Entities loaded: {len(res['entities'])}")

    # 1. Extract Kandira District & Kefken Island
    kandira_poly = None
    kefken_poly = None
    for e in res['entities']:
        if e.get('layer_name') == 'İLÇE_KANDIRA':
            coords = [(c['x'], c['y']) for c in e['coordinates']]
            kandira_poly = Polygon(coords)
        elif e.get('layer_name') == 'İLÇE_KEFKENADASı':
            coords = [(c['x'], c['y']) for c in e['coordinates']]
            kefken_poly = Polygon(coords)

    if not kandira_poly:
        raise ValueError("Could not find İLÇE_KANDIRA polygon!")

    print(f"Kandıra mainland points: {len(kandira_poly.exterior.coords)}, Kefken island points: {len(kefken_poly.exterior.coords) if kefken_poly else 0}")

    # Simplify with 2.0 meter tolerance in TM30 coordinates
    s_kandira = kandira_poly.simplify(2.0, preserve_topology=True)
    parts = [s_kandira]
    if kefken_poly:
        s_kefken = kefken_poly.simplify(2.0, preserve_topology=True)
        parts.append(s_kefken)

    district_mp = MultiPolygon(parts)
    district_wgs = transform(transformer.transform, district_mp)
    district_geom = round_coords(mapping(district_wgs))

    district_feature = {
        "type": "Feature",
        "id": "kandira_netcad_official",
        "properties": {
            "id": "kandira",
            "name": "Kandıra",
            "admin_level": 6,
            "boundary": "administrative",
            "type": "administrative",
            "province": "Kocaeli",
            "country": "Türkiye",
            "source": "Netcad NCZ (Kocaeli BB İdari Sınır 17.08.2022 - ITRF96 / TM30 reprojected to EPSG:4326)",
            "display_name": "Kandıra, Kocaeli, Marmara Bölgesi, Türkiye"
        },
        "geometry": district_geom
    }

    district_fc = {
        "type": "FeatureCollection",
        "features": [district_feature]
    }

    # Load existing OSM admin8 features to inherit osm_id and place_rank
    osm_lookup = {}
    if os.path.exists(OSM_ADMIN8_PATH):
        with open(OSM_ADMIN8_PATH) as f:
            osm_fc = json.load(f)
            for feat in osm_fc['features']:
                osm_lookup[feat['properties']['short_name']] = feat['properties']

    # 2. Extract 96 Mahalles
    mahalle_features = []
    centroids_map = {}

    for idx, e in enumerate(res['entities']):
        l = e.get('layer_name')
        if l in ['KÖY_SıNıRı', 'BEL_MAH_SıNıRı']:
            coords = [(c['x'], c['y']) for c in e.get('coordinates', [])]
            if len(coords) >= 3:
                p = Polygon(coords)
                # Strict check: area > 50,000 m² inside Kandıra district
                inter_area = kandira_poly.intersection(p).area
                if inter_area > 50000:
                    raw_lbl = e.get('label_text', '')
                    meta = NETCAD_LABEL_TO_MAHALLE.get(raw_lbl)
                    if not meta:
                        print(f"Warning: Unknown label {raw_lbl}")
                        continue
                    
                    short_name = meta['short_name']
                    full_name = meta['name']

                    # Simplify with 2.5 meter tolerance
                    s_poly = p.simplify(2.5, preserve_topology=True)
                    wgs_poly = transform(transformer.transform, s_poly)
                    geom_dict = round_coords(mapping(wgs_poly))

                    # Centroid in WGS84
                    c = p.centroid
                    c_lng, c_lat = transformer.transform(c.x, c.y)
                    centroids_map[short_name] = [round(c_lng, 6), round(c_lat, 6)]

                    # Inherit osm properties if available
                    osm_meta = osm_lookup.get(short_name, {})
                    osm_id = osm_meta.get('osm_id', 3000000 + idx)

                    feat = {
                        "type": "Feature",
                        "id": f"netcad-{idx}",
                        "properties": {
                            "osm_id": osm_id,
                            "netcad_layer": l,
                            "netcad_label": raw_lbl,
                            "name": full_name,
                            "short_name": short_name,
                            "admin_level": 8,
                            "boundary": "administrative",
                            "type": "administrative",
                            "district": "Kandıra",
                            "province": "Kocaeli",
                            "country": "Türkiye",
                            "area_sqkm": round(inter_area / 1e6, 3),
                            "centroid": [round(c_lng, 6), round(c_lat, 6)],
                            "display_name": f"{full_name}, Kandıra, Kocaeli, Marmara Bölgesi, Türkiye",
                            "source": "Netcad NCZ (Kocaeli BB İdari Sınır 17.08.2022)"
                        },
                        "geometry": geom_dict
                    }
                    mahalle_features.append(feat)

    # Sort mahalle features alphabetically by short_name
    mahalle_features.sort(key=lambda x: x['properties']['short_name'])

    mahalle_fc = {
        "type": "FeatureCollection",
        "features": mahalle_features
    }

    print(f"Extracted {len(mahalle_features)} official mahalles from Netcad NCZ.")

    # 3. Write GeoJSON and TS files
    # District GeoJSON
    dist_geojson_path = os.path.join(TARGET_DIR, 'kandira_district_official_netcad.geojson')
    with open(dist_geojson_path, 'w', encoding='utf-8') as f:
        json.dump(district_fc, f, ensure_ascii=False, separators=(',', ':'))
    print(f"Wrote {dist_geojson_path} ({os.path.getsize(dist_geojson_path)/1024:.1f} KB)")

    # Also update kandira_district_admin6.geojson for backward compatibility
    dist_admin6_path = os.path.join(TARGET_DIR, 'kandira_district_admin6.geojson')
    with open(dist_admin6_path, 'w', encoding='utf-8') as f:
        json.dump(district_fc, f, ensure_ascii=False, separators=(',', ':'))

    # District TS
    dist_ts_path = os.path.join(TARGET_DIR, 'kandiraDistrictAdmin6.ts')
    with open(dist_ts_path, 'w', encoding='utf-8') as f:
        f.write('import type { FeatureCollection, MultiPolygon } from "geojson";\n\n')
        f.write('export const kandiraDistrictAdmin6GeoJSON: FeatureCollection<MultiPolygon> = ')
        json.dump(district_fc, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n\nexport const kandiraDistrictOfficialNetcadGeoJSON = kandiraDistrictAdmin6GeoJSON;\n')
    print(f"Wrote {dist_ts_path} ({os.path.getsize(dist_ts_path)/1024:.1f} KB)")

    # Mahalles GeoJSON
    mah_geojson_path = os.path.join(TARGET_DIR, 'kandira_neighborhoods_official_netcad.geojson')
    with open(mah_geojson_path, 'w', encoding='utf-8') as f:
        json.dump(mahalle_fc, f, ensure_ascii=False, separators=(',', ':'))
    print(f"Wrote {mah_geojson_path} ({os.path.getsize(mah_geojson_path)/1024:.1f} KB)")

    # Also update kandira_neighborhoods_admin8.geojson for backward compatibility
    mah_admin8_path = os.path.join(TARGET_DIR, 'kandira_neighborhoods_admin8.geojson')
    with open(mah_admin8_path, 'w', encoding='utf-8') as f:
        json.dump(mahalle_fc, f, ensure_ascii=False, separators=(',', ':'))

    # Mahalles TS
    mah_ts_path = os.path.join(TARGET_DIR, 'kandiraNeighborhoodsAdmin8.ts')
    with open(mah_ts_path, 'w', encoding='utf-8') as f:
        f.write('import type { FeatureCollection, Polygon, MultiPolygon } from "geojson";\n\n')
        f.write('export const kandiraNeighborhoodsAdmin8GeoJSON: FeatureCollection<Polygon | MultiPolygon> = ')
        json.dump(mahalle_fc, f, ensure_ascii=False, separators=(',', ':'))
        f.write(';\n\nexport const kandiraNeighborhoodsOfficialNetcadGeoJSON = kandiraNeighborhoodsAdmin8GeoJSON;\n')
    print(f"Wrote {mah_ts_path} ({os.path.getsize(mah_ts_path)/1024:.1f} KB)")

    # Update index.ts to export official netcad symbols
    index_ts_path = os.path.join(TARGET_DIR, 'index.ts')
    with open(index_ts_path, 'w', encoding='utf-8') as f:
        f.write('export { kandiraDistrictAdmin6GeoJSON, kandiraDistrictOfficialNetcadGeoJSON } from "./kandiraDistrictAdmin6";\n')
        f.write('export { kandiraNeighborhoodsAdmin8GeoJSON, kandiraNeighborhoodsOfficialNetcadGeoJSON } from "./kandiraNeighborhoodsAdmin8";\n')

    # Save centroids JSON for inspection / updating kandiraNeighborhoods.ts
    centroids_path = '/tmp/kandira_netcad_centroids.json'
    with open(centroids_path, 'w', encoding='utf-8') as f:
        json.dump(centroids_map, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(centroids_map)} mahalle centroids to {centroids_path}")

if __name__ == '__main__':
    main()
