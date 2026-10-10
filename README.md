# TerraScope AI — Mineral Exploration Platform

An interactive **frontend-only presentation demo** for mineral-exploration teams, built using React 19, TypeScript, Vite, Recharts, Leaflet, OpenStreetMap tiles, Nginx and Docker.

**Important:** Every target location, score, assay, drillhole, geological interpretation, model readiness label and recommendation is **synthetic demonstration data**. No production GIS, machine-learning inference or validated mineral resource estimate is included. The real-world OpenStreetMap basemap is geographic context only; all displayed target coordinates, geoscience overlays and the subsurface illustration are invented examples and must not be used for exploration decisions.

## Start

```bash
git clone https://github.com/amiradmin/mineral-exploration-platform.git
cd mineral-exploration-platform
docker compose up -d --build
```

Open **http://localhost:8085**. To stop: `docker compose down`.

## Three functional role views

The demo starts on **Geologist Workbench**. Switch views using the sidebar: **Geologist Workbench** (interactive geographic map, target scoring filters, geological logging queue and laboratory sample follow-up), **Daily Operations** (metres drilled, logging, core recovery, QA/QC, operational registers), and **Executive Portfolio** (drilling delivery, fictional budget usage, program comparison and risk exposure). Each view links to detailed domain pages such as GIS Map, Target Intelligence and Drillholes.

The role selector changes presentation screens; it is **not authentication or role-based permission enforcement**. All records and budgets are explicitly simulated. CSV exports contain demo records only. Real user accounts, secured RBAC, data ingestion and persistence require a backend.

## Daily operations dashboard

The front page now demonstrates an exploration supervisor's daily operational workflow. Filter by fictional exploration project to inspect drilled vs planned metres, geological logging completeness, weighted core recovery, sample collection, assay turnaround backlog, open QA/QC issues, and simulated budget utilisation. The daily-shift bar chart provides drilling trend context. Operational registers contain searchable laboratory batches, QA/QC exceptions and action items; each register can be exported as CSV. Daily action completion works in current browser state only and does not persist.

The dashboard was informed by published workflows from Seequent MX Deposit / Target, acQuire GIM Essentials, Madini and KoBold Metals. It does **not** claim their technical models, commercial data, dashboards or functionality are integrated. All dates, counts, budgets and project names in the operations module are illustrative.

## Interactive demo features

- Nine modules: Daily Operations, Overview, GIS Map, Target Intelligence, Drillholes, Subsurface, Geoscience, AI Prospectivity, QA/QC
- Click target pins or ranked targets to open their evidence and next-action details
- Search targets by ID, name or commodity from the top search field
- Use the interactive **OpenStreetMap basemap** (pan and zoom); toggle simulated geology, faults, geochemistry, magnetics, drilling markers and target scores. Satellite-analysis and radiometrics datasets are not connected
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
2. Add PostGIS and GeoServer/OGC APIs, real satellite/geological overlays and a production-grade WebGL map.
3. Integrate sample intervals, assays, drillhole trajectories and laboratory QA/QC rules.
4. Validate prospectivity ranking with geologists and independent holdout regions, with calibrated uncertainties.
5. Implement authentication, role-based access, audit trails, and tested exports.

---

## راهنمای فارسی

سه صفحه تخصصی برای زمین‌شناس (Geologist Workbench)، مدیر عملیات (Daily Operations) و مدیرعامل (Executive Portfolio) افزوده شده‌اند. می‌توان از منوی سمت چپ بین نقش‌ها جابه‌جا شد. این تفکیک برای نمایش است و هنوز کنترل دسترسی واقعی ندارد. همه اطلاعات و بودجه‌ها نمونه هستند.\n\nصفحه عملیاتی «Daily Operations» و شاخص‌های تخصصی حفاری روزانه، لاگ زمین‌شناسی، بازیابی مغزه، نمونه‌های آزمایشگاهی معوق، وضعیت QA/QC، روند برنامه در برابر عملکرد و کارهای روزانه را نمایش می‌دهد. فیلتر پروژه، جست‌وجو و خروجی CSV فعال هستند ولی داده‌ها و تغییر وضعیت وظایف فقط نمایشی‌اند.\n\nاین پروژه در وضعیت فعلی یک **دموی قابل ارائه** برای شرکت اکتشاف معدن است. داده‌ها، نمره‌های هوش مصنوعی، اطلاعات حفاری و نقشه‌ها ساختگی هستند. از این خروجی‌ها نباید برای تصمیم واقعی حفاری یا سرمایه‌گذاری استفاده شود.

نقشه تعاملی از کاشی‌های OpenStreetMap استفاده می‌کند و برای نمایش زمینه نقشه به اینترنت نیاز دارد. نقاط معدنی روی نقشه ساختگی هستند و محل معادن واقعی نیستند.\n\nبرای راه‌اندازی، دستور `docker compose up -d --build` را اجرا کنید و آدرس `http://localhost:8085` را باز کنید. جست‌وجوی اهداف، مشاهده اطلاعات آن‌ها، انتخاب چند لایه نمایشی، تغییر نمای مدل شماتیک و دریافت گزارش نمونه فعال هستند.
