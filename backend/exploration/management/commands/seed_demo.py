from datetime import date
from django.core.management.base import BaseCommand
from exploration.models import AssayBatch, Drillhole, Element, EvidenceFactor, OperationProgram, QAQCIssue, Target, WorkTask


class Command(BaseCommand):
    help = "Load the synthetic TerraScope demonstration dataset."

    def handle(self, *args, **options):
        targets = [
            {"id":"T-001","name":"North Ridge","commodity":"Cu-Mo","deposit":"Porphyry Cu-Mo","ai_score":92,"confidence":91,"completeness":94,"priority":"Very High","stage":"Drill Ready","action":"Design drill fence","x":66,"y":30,"rationale":"A regional fault intersection coincides with a strong Cu-Mo geochemical cluster, residual magnetic anomaly and mapped hydrothermal alteration adjacent to an intrusive contact.","evidence":["Fault intersection","Cu-Mo soil anomaly","Residual magnetic high","Hydrothermal alteration","Intrusive contact"]},
            {"id":"T-002","name":"Copper Valley","commodity":"Cu-Au","deposit":"Porphyry Cu-Au","ai_score":87,"confidence":86,"completeness":89,"priority":"High","stage":"Advanced Target","action":"Infill geophysics","x":43,"y":47,"rationale":"Coincident copper-gold surface geochemistry overlies an interpreted intrusive centre with supportive magnetic response and a favorable structural corridor.","evidence":["Cu-Au anomaly","Intrusive centre","Magnetic response","Structural corridor"]},
            {"id":"T-003","name":"East Fault Zone","commodity":"Au","deposit":"Orogenic Au","ai_score":81,"confidence":79,"completeness":82,"priority":"High","stage":"Field Validation","action":"Map and channel sample","x":28,"y":63,"rationale":"Gold pathfinder elements and alteration signatures align with a major fault jog and mapped quartz-vein corridor.","evidence":["Au-As-Sb anomaly","Fault jog","Quartz veins","Alteration signature"]},
            {"id":"T-004","name":"Deep Target 03","commodity":"Cu","deposit":"Buried porphyry","ai_score":74,"confidence":76,"completeness":71,"priority":"Moderate","stage":"Conceptual","action":"Acquire IP/resistivity","x":74,"y":70,"rationale":"A broad magnetic low and structural geometry suggest a concealed intrusive target, but surface geochemical support is limited.","evidence":["Magnetic low","Structural geometry","Buried intrusive concept"]},
            {"id":"T-005","name":"South Ridge","commodity":"Fe-Cu","deposit":"Skarn","ai_score":69,"confidence":72,"completeness":78,"priority":"Moderate","stage":"Screening","action":"Detailed mapping","x":18,"y":35,"rationale":"Carbonate units near an intrusive margin show patchy Fe-Cu geochemistry and moderate magnetic response.","evidence":["Carbonate host","Intrusive margin","Fe-Cu anomaly"]},
        ]
        for item in targets:
            Target.objects.update_or_create(id=item["id"], defaults=item)

        for item in [
            {"id":"DH-021","depth":420,"azimuth":55,"dip":-65,"status":"Complete","intercept":"24 m @ 1.8% Cu"},
            {"id":"DH-022","depth":365,"azimuth":58,"dip":-62,"status":"Complete","intercept":"11 m @ 2.1% Cu"},
            {"id":"DH-023","depth":510,"azimuth":60,"dip":-70,"status":"Drilling","intercept":""},
            {"id":"DH-024","depth":450,"azimuth":48,"dip":-60,"status":"Planned","intercept":""},
            {"id":"DH-025","depth":390,"azimuth":52,"dip":-67,"status":"Complete","intercept":"36 m @ 0.92% Cu"},
            {"id":"DH-026","depth":530,"azimuth":64,"dip":-72,"status":"Planned","intercept":""},
        ]:
            Drillhole.objects.update_or_create(id=item["id"], defaults=item)

        for item in [
            {"symbol":"Cu","name":"Copper","anomalies":27}, {"symbol":"Au","name":"Gold","anomalies":19},
            {"symbol":"Mo","name":"Molybdenum","anomalies":16}, {"symbol":"As","name":"Arsenic","anomalies":14},
            {"symbol":"Pb","name":"Lead","anomalies":11}, {"symbol":"Zn","name":"Zinc","anomalies":9},
        ]:
            Element.objects.update_or_create(symbol=item["symbol"], defaults=item)

        for sort_order, (label, value) in enumerate([
            ("Structural control", 96), ("Geochemistry", 94), ("Magnetics", 91),
            ("Alteration", 85), ("Lithology", 82), ("Remote sensing", 76),
        ]):
            EvidenceFactor.objects.update_or_create(label=label, defaults={"value": value, "sort_order": sort_order})

        programs = {}
        for item in [
            {"name":"Central Porphyry","commodity":"Cu-Mo","rigs":2,"planned_metres":360,"actual_metres":318,"logged_metres":286,"core_recovery":96.4,"samples":84,"pending_assays":43,"budget_used":72,"target_count":3},
            {"name":"Northern Gold","commodity":"Au","rigs":1,"planned_metres":180,"actual_metres":152,"logged_metres":143,"core_recovery":93.2,"samples":59,"pending_assays":27,"budget_used":81,"target_count":2},
            {"name":"Eastern Skarn","commodity":"Fe-Cu","rigs":1,"planned_metres":125,"actual_metres":92,"logged_metres":80,"core_recovery":91.6,"samples":38,"pending_assays":19,"budget_used":88,"target_count":1},
        ]:
            programs[item["name"]], _ = OperationProgram.objects.update_or_create(name=item["name"], defaults=item)

        for item in [
            {"id":"LAB-1042","program":"Central Porphyry","batch":"CU-081","samples":42,"due_date":date(2026,10,9),"status":"Overdue","qa_status":"Pending"},
            {"id":"LAB-1043","program":"Northern Gold","batch":"AU-044","samples":27,"due_date":date(2026,10,11),"status":"In laboratory","qa_status":"Pending"},
            {"id":"LAB-1044","program":"Eastern Skarn","batch":"FE-026","samples":19,"due_date":date(2026,10,12),"status":"In laboratory","qa_status":"Pending"},
            {"id":"LAB-1039","program":"Central Porphyry","batch":"CU-079","samples":36,"due_date":date(2026,10,7),"status":"Received","qa_status":"Review"},
            {"id":"LAB-1036","program":"Northern Gold","batch":"AU-041","samples":31,"due_date":date(2026,10,6),"status":"Validated","qa_status":"Passed"},
        ]:
            program = programs[item.pop("program")]
            AssayBatch.objects.update_or_create(id=item["id"], defaults={**item, "program": program})

        for item in [
            {"id":"QC-128","program":"Central Porphyry","category":"Duplicate pair outside tolerance","severity":"High","owner":"QA/QC Geologist","status":"Open"},
            {"id":"QC-127","program":"Eastern Skarn","category":"Missing collar coordinate verification","severity":"High","owner":"GIS Specialist","status":"Review"},
            {"id":"QC-124","program":"Northern Gold","category":"Blank sample above action limit","severity":"Medium","owner":"Laboratory Liaison","status":"Open"},
            {"id":"QC-122","program":"Central Porphyry","category":"Overlapping lithology intervals","severity":"Medium","owner":"Logging Geologist","status":"Resolved"},
        ]:
            program = programs[item.pop("program")]
            QAQCIssue.objects.update_or_create(id=item["id"], defaults={**item, "program": program})

        for item in [
            {"name":"Verify CU-081 chain of custody","team":"Sample control","program":"Central Porphyry","priority":"Urgent","done":False},
            {"name":"Complete DH-023 lithology logging","team":"Field geology","program":"Central Porphyry","priority":"High","done":False},
            {"name":"Review blank contamination alert","team":"QA/QC","program":"Northern Gold","priority":"High","done":False},
            {"name":"Reconcile DH-026 planned vs actual depth","team":"Drilling supervisor","program":"Eastern Skarn","priority":"Normal","done":False},
            {"name":"Upload structural mapping traverse","team":"GIS","program":"Northern Gold","priority":"Normal","done":True},
        ]:
            program = programs[item.pop("program")]
            WorkTask.objects.update_or_create(name=item["name"], defaults={**item, "program": program})

        self.stdout.write(self.style.SUCCESS("Synthetic demonstration data loaded."))
