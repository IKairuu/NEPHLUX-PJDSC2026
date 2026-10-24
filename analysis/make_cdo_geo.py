"""Builds the Cagayan de Oro map data used by prototype v4.

Usage:  .venv/bin/python -I analysis/make_cdo_geo.py
Inputs:
  data/geo/cdo_barangays_psgc2023_hires.geojson        80 barangay boundaries, PSGC 2023
      (faeldon/philippines-json-maps, MIT; from altcoder/philippines-psgc-shapefiles)
  data/geo/cdo_barangay_population_2015_2020_2024.csv  PSA census populations by barangay
      (as bundled in the psgc R package, yng-me/psgc, MIT; 2020 total 728,402 matches PSA)
  data/geo/yakap_clinics_ph_2026-09-30.csv             PhilHealth YAKAP accredited list, 30 Sep 2026 (national)
Outputs:
  data/geo/cdo_yakap_clinics_located.csv               the 42 Cagayan de Oro clinics with map points
  prototype/src/cdo_geo_v4.json                        barangays (shape, centre, PSGC, population) + clinics

The PhilHealth list gives every clinic the same city-centre coordinate, so each clinic is pinned at a point
inside the barangay named in its street address. Where the address names only a downtown street, the clinic
is pinned in the barangay marked VERIFY below. All pins are APPROXIMATE (barangay level).
"""
import csv
import json
import os

from shapely.geometry import shape, mapping, Point

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEO = os.path.join(ROOT, "data", "geo")

# Barangay read from each clinic's street address in the PhilHealth list. VERIFY = address has no barangay.
CLINIC_BRGY = {
    "800 ZED MEDICALS AND NURSING CARE FACILITY SERVICES": "Gusa",
    "ALLIED CARE EXPERTS (ACE) MEDICAL CENTER - CAGAYAN DE ORO INC": "Lapasan",
    "BALUBAL SUPER HEALTH CENTER - YAKAP": "Balubal",
    "CAGAYAN DE ORO CITY HOSPITAL - TABLON YAKAP PRIMARY CARE PROVIDER": "Tablon",
    "CAGAYAN DE ORO CITY HOSPITAL- LUMBIA (YAKAP PROVIDER)": "Lumbia",
    "CAGAYAN DE ORO MEDICAL CENTER, INC.": "Barangay 20",
    "CAPITOL UNIVERSITY MEDICAL CENTER FOUNDATION OF CAGAYAN INC.": "Gusa",          # VERIFY: address "CUMC Bldg." only
    "CDO AGUSAN YAKAP PRIMARY CARE PROVIDER": "Agusan",
    "CDO BALULANG YAKAP PRIMARY CARE PROVIDER": "Balulang",
    "CDO BUGO YAKAP PRIMARY CARE FACILITY": "Bugo",
    "CDO CALAANAN YAKAP PRIMARY CARE PROVIDER": "Canito-an",                           # VERIFY: Calaanan is a sitio
    "CDO CAMAMAN-AN YAKAP PRIMARY CARE PROVIDER": "Camaman-an",
    "CDO CARMEN YAKAP PRIMARY CARE PROVIDER": "Carmen",
    "CDO CHO YAKAP PRIMARY CARE FACILITY": "Barangay 40",
    "CDO CITY HALL YAKAP PRIMARY CARE PROVIDER": "Barangay 1",
    "CDO CUGMAN YAKAP PRIMARY CARE PROVIDER": "Cugman",
    "CDO GUSA YAKAP PRIMARY CARE FACILITY": "Gusa",
    "CDO IPONAN YAKAP PRIMARY CARE PROVIDER": "Iponan",
    "CDO LAPASAN YAKAP PRIMARY CARE PROVIDER": "Lapasan",
    "CDO LUMBIA YAKAP PRIMARY CARE FACILITY": "Lumbia",
    "CDO MACABALAN 1 YAKAP PRIMARY CARE PROVIDER": "Macabalan",
    "CDO MACASANDIG YAKAP PRIMARY CARE PROVIDER": "Macasandig",
    "CDO MAMBUAYA YAKAP PRIMARY CARE PROVIDER": "Mambuaya",
    "CDO NAZARETH YAKAP PRIMARY CARE PROVIDER": "Nazareth",
    "CDO NHA KAUSWAGAN YAKAP PRIMARY CARE PROVIDER": "Kauswagan",
    "CDO PAGATPAT YAKAP PRIMARY CARE PROVIDER": "Pagatpat",
    "CDO PUNTOD YAKAP PRIMARY CARE PROVIDER": "Puntod",
    "CDO TABLON YAKAP PRIMARY CARE FACILITY": "Tablon",
    "CDO UPPER BALULANG YAKAP PRIMARY CARE PROVIDER": "Balulang",
    "CESH, 4ID, PA KONSULTA PROVIDER": "Patag",                                        # Camp Evangelista, Patag
    "DPCY HEALTH CARE DIAGNOSTIC & DRUG TESTING CENTER": "Barangay 1",                 # VERIFY: Hayes St only
    "HEALTHCHECK CLINIC AND DIAGNOSTIC CENTER": "Barangay 14",
    "HMC, INC. (HEALTHWAY MEDICAL)": "Barangay 24",
    "J.R. BORJA GENERAL HOSPITAL KONSULTA PROVIDER": "Carmen",
    "LICEO DE CAGAYAN UNIVERSITY - PHILHEALTH YAKAP": "Kauswagan",
    "MEDISENSE LABORATORY CENTER INC.": "Barangay 1",                                  # VERIFY: A. Luna St only
    "NORTHERN MINDANAO MEDICAL CENTER OUT-PATIENT DEPARTMENT": "Barangay 1",           # VERIFY: "Capitol Compound"
    "PUERTO COMMUNITY HOSPITAL": "Puerto",
    "USTP-CDO MEDICAL CLINIC": "Lapasan",                                              # VERIFY: CM Recto Ave campus
    "VITALAB HEALTHCARE INC.": "Barangay 1",                                           # VERIFY: Luna-Velez St only
    "VITALIACARE MEDICAL CLINIC": "Carmen",                                            # VERIFY: Masterson Ave only
    "WF GALAM PHARMACY": "Carmen",
}
VERIFY = {"CAPITOL UNIVERSITY MEDICAL CENTER FOUNDATION OF CAGAYAN INC.", "CDO CALAANAN YAKAP PRIMARY CARE PROVIDER",
          "DPCY HEALTH CARE DIAGNOSTIC & DRUG TESTING CENTER", "MEDISENSE LABORATORY CENTER INC.",
          "NORTHERN MINDANAO MEDICAL CENTER OUT-PATIENT DEPARTMENT", "USTP-CDO MEDICAL CLINIC",
          "VITALAB HEALTHCARE INC.", "VITALIACARE MEDICAL CLINIC"}
SHORT = {
    "CDO CHO YAKAP PRIMARY CARE FACILITY": "City Health Office (CHO)",
    "CDO CITY HALL YAKAP PRIMARY CARE PROVIDER": "City Hall YAKAP clinic",
    "NORTHERN MINDANAO MEDICAL CENTER OUT-PATIENT DEPARTMENT": "Northern Mindanao Medical Center OPD",
    "CESH, 4ID, PA KONSULTA PROVIDER": "Camp Evangelista Station Hospital",
    "HMC, INC. (HEALTHWAY MEDICAL)": "Healthway Medical (Centrio)",
    "CAGAYAN DE ORO CITY HOSPITAL- LUMBIA (YAKAP PROVIDER)": "Cagayan de Oro City Hospital - Lumbia",
    "CAGAYAN DE ORO CITY HOSPITAL - TABLON YAKAP PRIMARY CARE PROVIDER": "Cagayan de Oro City Hospital - Tablon",
    "BALUBAL SUPER HEALTH CENTER - YAKAP": "Balubal Super Health Center",
    "J.R. BORJA GENERAL HOSPITAL KONSULTA PROVIDER": "J.R. Borja General Hospital",
}


def short(name):
    if name in SHORT:
        return SHORT[name]
    s = name.replace(" YAKAP PRIMARY CARE PROVIDER", " YAKAP clinic").replace(" YAKAP PRIMARY CARE FACILITY", " YAKAP clinic")
    s = s.replace(", INC.", "").replace(" INC.", "").replace(" INC", "").replace(" - PHILHEALTH YAKAP", "")
    words = []
    for w in s.split():
        words.append(w if w in ("CDO", "YAKAP", "ACE", "(ACE)", "USTP-CDO", "NHA", "CUMC", "DPCY", "WF", "J.R.", "1") else w.capitalize())
    return " ".join(words).replace("Cdo ", "CDO ").replace(" Of ", " of ").replace(" De ", " de ").replace(" And ", " and ")


def r5(geom):
    def rnd(c):
        return [rnd(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 5), round(c[1], 5)]
    m = mapping(geom)
    return {"type": m["type"], "coordinates": rnd(m["coordinates"])}


def spread(poly, base, k):
    """k-th pin in the same barangay: step around the base point (about 120 m) and stay inside the polygon."""
    if k == 0:
        return base
    for r in (0.0011, 0.0007, 0.0004):
        p = Point(base.x + r * [1, -1, 0, 0, 1, -1][k % 6], base.y + r * [0, 0, 1, -1, 1, -1][k % 6])
        if poly.contains(p):
            return p
    return base


def main():
    gj = json.load(open(os.path.join(GEO, "cdo_barangays_psgc2023_hires.geojson")))
    pop = {r["psgc_code"]: r for r in csv.DictReader(open(os.path.join(GEO, "cdo_barangay_population_2015_2020_2024.csv")))}
    brgys, shapes = [], {}
    for f in sorted(gj["features"], key=lambda f: f["properties"]["adm4_psgc"]):
        g = shape(f["geometry"]).simplify(0.0001, preserve_topology=True)
        c, rp = g.centroid, g.representative_point()
        name, code = f["properties"]["adm4_en"], str(f["properties"]["adm4_psgc"])
        assert pop[code]["barangay"] == name, (code, name)
        shapes[name] = (g, rp)
        brgys.append({"name": name, "psgc": code, "pop2020": int(pop[code]["pop2020"]), "pop2024": int(pop[code]["pop2024"]),
                      "centre": [round(c.y, 5), round(c.x, 5)] if g.contains(c) else [round(rp.y, 5), round(rp.x, 5)],
                      "pin": [round(rp.y, 5), round(rp.x, 5)], "geometry": r5(g)})
    assert len(brgys) == 80 and sum(b["pop2020"] for b in brgys) == 728402
    clinics, used = [], {}
    with open(os.path.join(GEO, "yakap_clinics_ph_2026-09-30.csv"), encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            if row["city_municipality"] != "City of Cagayan De Oro":
                continue
            b = CLINIC_BRGY[row["facility_name"]]
            g, rp = shapes[b]
            p = spread(g, rp, used.get(b, 0)); used[b] = used.get(b, 0) + 1
            clinics.append({"name": row["facility_name"], "short": short(row["facility_name"]), "sector": row["sector"],
                            "public": row["sector"] == "Government", "tel": row["tel_no"], "address": row["street_address"],
                            "brgy": b, "lat": round(p.y, 5), "lon": round(p.x, 5),
                            "located": ("VERIFY: address has no barangay; pinned downtown/nearby" if row["facility_name"] in VERIFY
                                        else "approximate: point inside the barangay in its address"),
                            "accreditation_expiry": row["accreditation_expiry"]})
    assert len(clinics) == 42 and sum(c["public"] for c in clinics) == 29, len(clinics)
    with open(os.path.join(GEO, "cdo_yakap_clinics_located.csv"), "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(clinics[0].keys()))
        w.writeheader(); w.writerows(clinics)
    out = {"source_boundaries": "PSGC 2023 barangay boundaries (faeldon/philippines-json-maps, MIT)",
           "source_population": "PSA 2020 Census of Population and Housing, via the psgc R package (MIT)",
           "source_clinics": "PhilHealth YAKAP accredited providers, 30 Sep 2026",
           "barangays": brgys, "clinics": clinics}
    p = os.path.join(ROOT, "prototype", "src", "cdo_geo_v4.json")
    json.dump(out, open(p, "w"), separators=(",", ":"))
    print("wrote", p, os.path.getsize(p) // 1024, "KB;", len(brgys), "barangays,", len(clinics), "clinics")


if __name__ == "__main__":
    main()
