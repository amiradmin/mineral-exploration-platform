# TerraScope AI — Mineral Exploration Platform

An interactive **frontend-only presentation demo** for mineral-exploration teams, built using React 19, TypeScript, Vite, Recharts, Nginx and Docker.

**Important:** Every target location, score, assay, drillhole, geological interpretation, model readiness label and recommendation is **synthetic demonstration data**. No production GIS, machine-learning inference or validated mineral resource estimate is included. The illustrated map and subsurface layers must not be used for exploration decisions.

## Start

```bash
git clone https://github.com/amiradmin/mineral-exploration-platform.git
cd mineral-exploration-platform
docker compose up -d --build
```

Open **http://localhost:8085**. To stop: `docker compose down`.

## Interactive demo features

- Eight modules: Overview, GIS Map, Target Intelligence, Drillholes, Subsurface, Geoscience, AI Prospectivity, QA/QC
- Click target pins or ranked targets to open their evidence and next-action details
- Search targets by ID, name or commodity from the top search field
- Toggle **supported schematic overlays** (geology, structures, magnetics, prospectivity); the other listed GIS layers need real data integration
- Switch subsurface illustration emphasis between views (not a true 3D volume renderer)
- Select an element in Geoscience; anomaly count changes, while statistical percentiles remain illustrative copper placeholders
- **Export Demo Snapshot** downloads a JSON bundle of the mock datasets
- **Generate Demo Brief** downloads a Markdown report explicitly identifying simulated results

## Development

```bash
npm install
npm run dev
npm run build
```

## Next production milestones

1. Establish project and exploration-license geodata, including coordinate reference systems and provenance.
2. Add PostGIS and GeoServer/OGC APIs, real satellite/geological overlays and interactive WebGL map.
3. Integrate sample intervals, assays, drillhole trajectories and laboratory QA/QC rules.
4. Validate prospectivity ranking with geologists and independent holdout regions, with calibrated uncertainties.
5. Implement authentication, role-based access, audit trails, and tested exports.

---

## راهنمای فارسی

این پروژه در وضعیت فعلی یک **دموی قابل ارائه** برای شرکت اکتشاف معدن است. داده‌ها، نمره‌های هوش مصنوعی، اطلاعات حفاری و نقشه‌ها ساختگی هستند. از این خروجی‌ها نباید برای تصمیم واقعی حفاری یا سرمایه‌گذاری استفاده شود.

برای راه‌اندازی، دستور `docker compose up -d --build` را اجرا کنید و آدرس `http://localhost:8085` را باز کنید. جست‌وجوی اهداف، مشاهده اطلاعات آن‌ها، انتخاب چند لایه نمایشی، تغییر نمای مدل شماتیک و دریافت گزارش نمونه فعال هستند.
