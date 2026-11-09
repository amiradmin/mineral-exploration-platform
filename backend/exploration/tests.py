from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import AuditEvent, EvidenceReadiness, GateDecision, OperationProgram, SourceConnection, SourceDataSnapshot, EvidenceFactorRule, EvidenceEvaluation, Target, WorkTask


class ExplorationApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        cls.user = get_user_model().objects.create_user(username="staffer", password="test-password")
        cls.approver = get_user_model().objects.create_user(username="approver", password="test-password")
        Group.objects.get_or_create(name="data_steward")[0].user_set.add(cls.user)
        Group.objects.get_or_create(name="board_approver")[0].user_set.add(cls.approver)

    def test_public_demo_reads(self):
        response = self.client.get("/api/targets/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 5)
        self.assertEqual(response.data["results"][0]["id"], "T-001")
        self.assertEqual(response.data["results"][0]["aiScore"], 92)

    def test_operation_summary_aggregates_programs(self):
        response = self.client.get("/api/programs/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totals"]["planned"], 665)
        self.assertEqual(response.data["totals"]["actual"], 562)

    def test_assay_batch_serializes_program_name(self):
        response = self.client.get("/api/assay-batches/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("project", response.data["results"][0])

    def test_anonymous_and_unprivileged_mutations_are_rejected(self):
        task = WorkTask.objects.get(name="Verify CU-081 chain of custody")
        url = f"/api/tasks/{task.pk}/"
        self.assertIn(self.client.patch(url, {"done": True}, format="json").status_code, (401, 403))
        self.client.force_authenticate(user=self.approver)
        self.assertEqual(self.client.patch(url, {"done": True}, format="json").status_code, 403)
        task.refresh_from_db()
        self.assertFalse(task.done)

    def test_authorized_mutation_is_audited(self):
        task = WorkTask.objects.get(name="Verify CU-081 chain of custody")
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(f"/api/tasks/{task.pk}/", {"done": True}, format="json")
        self.assertEqual(response.status_code, 200)
        task.refresh_from_db()
        self.assertTrue(task.done)
        self.assertTrue(AuditEvent.objects.filter(actor=self.user, action="update", entity_type="WorkTask", entity_id=str(task.pk)).exists())

    def test_fid_rejects_missing_and_unverified_evidence(self):
        program = OperationProgram.objects.get(name="Central Porphyry")
        self.client.force_authenticate(user=self.approver)
        url = f"/api/programs/{program.pk}/gate-decisions/"
        payload = {"gate": 4, "outcome": "GO", "rationale": "Decision"}
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 409)
        EvidenceReadiness.objects.create(program=program, data_status="unverified", detailed_exploration=True, qaqc_approved=True, competent_person_approved=True)
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 409)
        self.assertIn("evidence_unverified", response.data["blockers"])
        self.assertFalse(GateDecision.objects.exists())

    def test_authorized_verified_fid_is_persisted_and_audited(self):
        program = OperationProgram.objects.get(name="Central Porphyry")
        EvidenceReadiness.objects.create(program=program, data_status="verified", detailed_exploration=True, qaqc_approved=True, competent_person_approved=True)
        url = f"/api/programs/{program.pk}/gate-decisions/"
        payload = {"gate": 4, "outcome": "GO", "rationale": "Reviewed evidence"}
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.post(url, payload, format="json").status_code, 403)
        self.client.force_authenticate(user=self.approver)
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(GateDecision.objects.get(pk=response.data["id"]).approver, self.approver)
        self.assertTrue(AuditEvent.objects.filter(action="gate_decision", entity_id=str(response.data["id"])).exists())


    def test_source_details_without_connection_is_not_reported_as_live(self):
        response = self.client.get("/api/source-details/T-001/gis/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "not_configured")
        self.assertIsNone(response.data["latest"])
        self.assertIsNone(response.data["protocol"])

    def test_source_details_return_latest_recorded_snapshot(self):
        connection = SourceConnection.objects.create(
            target=Target.objects.get(pk="T-001"), software_key="gis",
            protocol="csv", data_format="GeoJSON", status="configured", is_demo=True,
        )
        SourceDataSnapshot.objects.create(
            connection=connection, dataset="faults-older",
            observed_at=timezone.now(), values={"features": 3},
        )
        newest = SourceDataSnapshot.objects.create(
            connection=connection, dataset="faults-newer",
            observed_at=timezone.now(), values={"features": 6},
        )
        response = self.client.get("/api/source-details/T-001/gis/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["protocol"], "CSV import")
        self.assertEqual(response.data["latest"]["dataset"], newest.dataset)
        self.assertEqual(response.data["latest"]["values"]["features"], 6)

    def test_real_customer_source_is_not_public(self):
        SourceConnection.objects.create(
            target=Target.objects.get(pk="T-001"), software_key="gis",
            protocol="api", status="configured", is_demo=False,
        )
        response = self.client.get("/api/source-details/T-001/gis/")
        self.assertEqual(response.status_code, 403)
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get("/api/source-details/T-001/gis/").status_code, 403)
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        self.assertEqual(self.client.get("/api/source-details/T-001/gis/").status_code, 200)


    @staticmethod
    def simulated_gis_payload():
        return {
            "target_id": "T-001",
            "dataset": "synthetic-arcgis-qgis-structures",
            "observed_at": timezone.now().isoformat(),
            "geojson": {"type": "FeatureCollection", "features": [
                {"type": "Feature", "geometry": {
                    "type": "LineString",
                    "coordinates": [[54.1, 32.2], [54.2, 32.3]],
                }, "properties": {"name": "Simulated Fault", "synthetic": True}},
                {"type": "Feature", "geometry": {
                    "type": "Point", "coordinates": [54.2, 32.3],
                }, "properties": {"name": "Simulated Intersection"}},
            ]},
        }

    def test_simulator_endpoint_requires_opt_in_and_secret(self):
        from unittest.mock import patch
        data = self.simulated_gis_payload()
        with patch.dict("os.environ", {"GIS_SIMULATOR_ENABLED": "false", "GIS_SIMULATOR_TOKEN": "A"*40}):
            response = self.client.post("/api/simulators/gis/ingest/", data, format="json", HTTP_X_GIS_SIMULATOR_TOKEN="A"*40)
            self.assertEqual(response.status_code, 403)
        with patch.dict("os.environ", {"GIS_SIMULATOR_ENABLED": "true", "GIS_SIMULATOR_TOKEN": "A"*40}):
            response = self.client.post("/api/simulators/gis/ingest/", data, format="json", HTTP_X_GIS_SIMULATOR_TOKEN="wrong")
            self.assertEqual(response.status_code, 403)
        self.assertFalse(SourceConnection.objects.filter(target_id="T-001", software_key="gis").exists())

    def test_simulator_end_to_end_appears_in_source_details(self):
        from unittest.mock import patch
        with patch.dict("os.environ", {"GIS_SIMULATOR_ENABLED": "true", "GIS_SIMULATOR_TOKEN": "A"*40}):
            response = self.client.post(
                "/api/simulators/gis/ingest/",
                self.simulated_gis_payload(), format="json", HTTP_X_GIS_SIMULATOR_TOKEN="A"*40,
            )
        self.assertEqual(response.status_code, 201, response.data)
        detail = self.client.get("/api/source-details/T-001/gis/")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["protocol"], "REST API")
        self.assertEqual(detail.data["status"], "connected")
        self.assertEqual(detail.data["latest"]["values"]["feature_count"], 2)
        self.assertEqual(detail.data["latest"]["values"]["fault_line_count"], 1)
        self.assertTrue(detail.data["latest"]["values"]["simulated"])
        self.assertIsNotNone(detail.data["last_success_at"])

    def test_simulator_cannot_overwrite_customer_gis_connection(self):
        from unittest.mock import patch
        SourceConnection.objects.create(target=Target.objects.get(pk="T-001"), software_key="gis",
                                        protocol="ogc", is_demo=False, status="configured")
        with patch.dict("os.environ", {"GIS_SIMULATOR_ENABLED": "true", "GIS_SIMULATOR_TOKEN": "A"*40}):
            response = self.client.post(
                "/api/simulators/gis/ingest/",
                self.simulated_gis_payload(), format="json", HTTP_X_GIS_SIMULATOR_TOKEN="A"*40,
            )
        self.assertEqual(response.status_code, 409)
        self.assertFalse(SourceDataSnapshot.objects.filter(connection__target_id="T-001", connection__software_key="gis").exists())

    def test_simulator_rejects_invalid_geojson(self):
        from unittest.mock import patch
        payload = self.simulated_gis_payload()
        payload["geojson"] = {"type": "FeatureCollection", "features": []}
        with patch.dict("os.environ", {"GIS_SIMULATOR_ENABLED": "true", "GIS_SIMULATOR_TOKEN": "A"*40}):
            response = self.client.post(
                "/api/simulators/gis/ingest/",
                payload, format="json", HTTP_X_GIS_SIMULATOR_TOKEN="A"*40,
            )
        self.assertEqual(response.status_code, 400)

    def test_snapshot_history_filters_received_at_inclusive(self):
        from datetime import timedelta
        connection = SourceConnection.objects.create(
            target=Target.objects.get(pk="T-001"), software_key="gis",
            protocol="api", is_demo=True,
        )
        now = timezone.now()
        first = SourceDataSnapshot.objects.create(
            connection=connection, dataset="old", observed_at=now,
            values={"feature_count": 1, "geojson": {"type": "FeatureCollection", "features": []}},
        )
        middle = SourceDataSnapshot.objects.create(
            connection=connection, dataset="middle", observed_at=now,
            values={"feature_count": 2},
        )
        last = SourceDataSnapshot.objects.create(
            connection=connection, dataset="new", observed_at=now,
            values={"feature_count": 3},
        )
        SourceDataSnapshot.objects.filter(pk=first.pk).update(received_at=now-timedelta(hours=2))
        SourceDataSnapshot.objects.filter(pk=middle.pk).update(received_at=now-timedelta(minutes=30))
        SourceDataSnapshot.objects.filter(pk=last.pk).update(received_at=now)
        url = "/api/source-details/T-001/gis/snapshots/"
        result = self.client.get(url, {
            "from": (now-timedelta(hours=1)).isoformat(),
            "to": now.isoformat(),
        })
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["count"], 2)
        self.assertEqual([row["dataset"] for row in result.data["results"]], ["new", "middle"])
        self.assertEqual(result.data["results"][0]["values"]["feature_count"], 3)
        self.assertEqual(result.data["time_field"], "received_at")

    def test_snapshot_history_pagination_and_bad_query(self):
        connection = SourceConnection.objects.create(
            target=Target.objects.get(pk="T-001"), software_key="gis",
            protocol="api", is_demo=True,
        )
        for i in range(12):
            SourceDataSnapshot.objects.create(
                connection=connection, dataset=f"snapshot-{i:02d}",
                observed_at=timezone.now(), values={"index": i},
            )
        url = "/api/source-details/T-001/gis/snapshots/"
        response = self.client.get(url, {"page": 2})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 12)
        self.assertEqual(response.data["pages"], 2)
        self.assertEqual(len(response.data["results"]), 2)
        self.assertEqual(response.data["results"][0]["values"]["index"], 1)
        for params in (
            {"from": "2026-11-09T12:00:00"},
            {"to": "not-a-date"},
            {"from": "2026-11-09T12:00:00Z", "to": "2026-11-08T12:00:00Z"},
            {"page": "-1"},
        ):
            self.assertEqual(self.client.get(url, params).status_code, 400)
        self.assertEqual(self.client.get(url, {"page": 3}).data["results"], [])

    def test_snapshot_history_protects_private_source(self):
        connection = SourceConnection.objects.create(
            target=Target.objects.get(pk="T-001"), software_key="gis",
            protocol="api", is_demo=False,
        )
        SourceDataSnapshot.objects.create(
            connection=connection, dataset="customer-private",
            observed_at=timezone.now(), values={"sensitive": "do not disclose"},
        )
        url = "/api/source-details/T-001/gis/snapshots/"
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["dataset"], "customer-private")

    def test_snapshot_history_no_source_returns_empty(self):
        response = self.client.get("/api/source-details/T-001/gis/snapshots/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])


class EvidenceLineageTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        cls.target = Target.objects.get(pk="T-001")
        cls.steward = get_user_model().objects.create_user(username="lineage-steward", password="test-password")
        cls.cp = get_user_model().objects.create_user(username="lineage-cp", password="test-password")
        Group.objects.get_or_create(name="data_steward")[0].user_set.add(cls.steward)
        Group.objects.get_or_create(name="competent_person")[0].user_set.add(cls.cp)

    def _source_rule(self, key="gis", factor="P_Pathway", metric="density", demo=True):
        connection, _ = SourceConnection.objects.get_or_create(
            target=self.target, software_key=key,
            defaults={"protocol": "api", "data_format": "GeoJSON", "is_demo": demo},
        )
        rule = EvidenceFactorRule.objects.create(
            connection=connection, factor=factor, metric_key=metric,
            input_min=0, input_max=10, output_min=0, output_max=100,
            weight=1, is_demonstration=demo,
            rationale="Synthetic linear normalization" if demo else "Methodology pending specialist approval",
        )
        snapshot = SourceDataSnapshot.objects.create(
            connection=connection, dataset="test-" + factor,
            observed_at=timezone.now(),
            values={metric: 2.5, "simulated": demo},
        )
        return connection, rule, snapshot

    def test_registry_uses_real_connections_not_hardcoded_per_target(self):
        response = self.client.get("/api/targets/T-001/sources/")
        self.assertEqual(response.status_code, 200)
        index = {item["key"]: item for item in response.data["sources"]}
        self.assertFalse(index["gis"]["configured"])
        self.assertFalse(index["gcd"]["configured"])
        self._source_rule()
        response = self.client.get("/api/targets/T-001/sources/")
        index = {item["key"]: item for item in response.data["sources"]}
        self.assertTrue(index["gis"]["configured"])
        self.assertEqual(index["gis"]["mapped_factors"], ["P_Pathway"])
        self.assertFalse(index["gcd"]["configured"])

    def test_simulated_rule_has_frozen_lineage_and_cannot_be_approved(self):
        connection, rule, snapshot = self._source_rule()
        self.client.force_authenticate(user=self.steward)
        response = self.client.post("/api/targets/T-001/evidence-evaluations/", {}, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        run = EvidenceEvaluation.objects.get(pk=response.data["id"])
        self.assertEqual(run.status, "demo")
        self.assertEqual(run.outputs["P_Pathway"], 25.0)
        self.assertEqual(run.parameters["missing_factors"], ["P_Source", "P_Trap", "P_Timing"])
        self.assertEqual(run.inputs.get().snapshot_id, snapshot.pk)
        self.assertEqual(run.inputs.get().rule_id, rule.pk)
        self.assertEqual(run.inputs.get().frozen_rule["version"], 1)
        self.assertEqual(len(run.content_sha256), 64)
        self.assertFalse(response.data["decision_grade"])
        self.assertTrue(AuditEvent.objects.filter(action="evidence_evaluation_created", entity_id=str(run.pk)).exists())
        self.client.force_authenticate(user=self.cp)
        self.assertEqual(self.client.post(
            f"/api/targets/T-001/evidence-evaluations/{run.pk}/approve/", {},
            format="json",
        ).status_code, 409)
        self.assertEqual(self.client.post(
            f"/api/evidence/rules/{rule.pk}/approve/", {},
            format="json",
        ).status_code, 409)

    def test_non_demo_source_and_runs_are_not_public(self):
        self._source_rule(demo=False)
        anon_registry = self.client.get("/api/targets/T-001/sources/")
        self.assertFalse(next(row for row in anon_registry.data["sources"] if row["key"] == "gis")["configured"])
        self.client.force_authenticate(user=self.steward)
        run = self.client.post("/api/targets/T-001/evidence-evaluations/", {}, format="json")
        self.assertEqual(run.status_code, 201)
        self.client.force_authenticate(user=None)
        public_runs = self.client.get("/api/targets/T-001/evidence-evaluations/")
        self.assertEqual(public_runs.data["results"], [])
        self.assertEqual(self.client.post("/api/targets/T-001/evidence-evaluations/", {}, format="json").status_code, 403)

    def test_reviewed_four_factor_run_is_approvable_only_by_cp(self):
        for factor, key in zip(("P_Source","P_Pathway","P_Trap","P_Timing"), ("gcd","gis","rock","geobank")):
            _, rule, _ = self._source_rule(key=key, factor=factor, demo=False)
            self.client.force_authenticate(user=self.cp)
            response = self.client.post(f"/api/evidence/rules/{rule.pk}/approve/", {}, format="json")
            self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(user=self.steward)
        response = self.client.post("/api/targets/T-001/evidence-evaluations/", {}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(len(response.data["provenance"]), 4)
        run_id = response.data["id"]
        self.assertEqual(self.client.post(
            f"/api/targets/T-001/evidence-evaluations/{run_id}/approve/", {},
            format="json",
        ).status_code, 403)
        self.client.force_authenticate(user=self.cp)
        approved = self.client.post(
            f"/api/targets/T-001/evidence-evaluations/{run_id}/approve/", {},
            format="json",
        )
        self.assertEqual(approved.status_code, 200, approved.data)
        self.assertEqual(approved.data["status"], "approved")
        self.assertTrue(approved.data["decision_grade"])
        self.assertTrue(AuditEvent.objects.filter(
            action="evidence_evaluation_approved", entity_id=str(run_id),
        ).exists())

    def test_snapshot_tampering_blocks_approval(self):
        for factor, key in zip(("P_Source","P_Pathway","P_Trap","P_Timing"), ("gcd","gis","rock","geobank")):
            _, rule, _ = self._source_rule(key=key, factor=factor, demo=False)
            rule.approved_by = self.cp
            rule.approved_at = timezone.now()
            rule.save()
        self.client.force_authenticate(user=self.steward)
        response = self.client.post("/api/targets/T-001/evidence-evaluations/", {}, format="json")
        self.assertEqual(response.data["status"], "pending")
        snapshot = SourceDataSnapshot.objects.get(pk=response.data["provenance"][0]["snapshot_id"])
        snapshot.values = {"density": 9.9, "simulated": False}
        snapshot.save(update_fields=["values"])
        self.client.force_authenticate(user=self.cp)
        self.assertEqual(self.client.post(
            f"/api/targets/T-001/evidence-evaluations/{response.data['id']}/approve/", {},
            format="json",
        ).status_code, 409)

    def test_new_rule_version_can_be_traced_independently(self):
        connection, rule, _ = self._source_rule()
        EvidenceFactorRule.objects.create(
            connection=connection, factor="P_Pathway", metric_key="density", version=2,
            input_min=0, input_max=5, weight=1, is_demonstration=True,
            rationale="New demo normalization scale",
        )
        self.client.force_authenticate(user=self.steward)
        response = self.client.post("/api/targets/T-001/evidence-evaluations/", {}, format="json")
        self.assertEqual(response.data["provenance"][0]["rule_version"], 2)
        self.assertEqual(response.data["outputs"]["P_Pathway"], 50)

    def test_gis_simulator_creates_linked_demo_evaluation(self):
        from unittest.mock import patch
        payload = ExplorationApiTests.simulated_gis_payload()
        payload["geojson"]["features"][1]["properties"]["fracture_density_per_km2"] = 2.5
        with patch.dict("os.environ", {"GIS_SIMULATOR_ENABLED": "true", "GIS_SIMULATOR_TOKEN": "A"*40}):
            response = self.client.post(
                "/api/simulators/gis/ingest/",
                payload, format="json", HTTP_X_GIS_SIMULATOR_TOKEN="A"*40,
            )
        self.assertEqual(response.status_code, 201, response.data)
        detail = self.client.get("/api/targets/T-001/evidence-evaluations/")
        self.assertEqual(detail.status_code, 200, detail.data)
        run = detail.data["latest"]
        self.assertEqual(run["status"], "demo")
        self.assertEqual(run["outputs"]["P_Pathway"], 50.0)
        self.assertEqual(run["provenance"][0]["snapshot_id"], response.data["id"])
        self.assertEqual(run["provenance"][0]["frozen_rule"]["version"], 1)
        self.assertFalse(run["decision_grade"])

    def test_public_demo_run_does_not_expose_mixed_private_source(self):
        self._source_rule(key="gcd", factor="P_Source", demo=False)
        self._source_rule(key="gis", factor="P_Pathway", demo=True)
        self.client.force_authenticate(user=self.steward)
        created = self.client.post("/api/targets/T-001/evidence-evaluations/", {}, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["status"], "demo")
        self.client.force_authenticate(user=None)
        public = self.client.get("/api/targets/T-001/evidence-evaluations/")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data["results"], [])


class CommitteeWorkflowTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        from .models import CommitteeMembership
        cls.target = Target.objects.get(pk="T-001")
        cls.other = Target.objects.get(pk="T-002")
        User = get_user_model()
        cls.expert = User.objects.create_user("committee-expert", password="test-password")
        cls.cp = User.objects.create_user("committee-cp", password="test-password")
        cls.chair = User.objects.create_user("committee-chair", password="test-password")
        cls.board = User.objects.create_user("committee-board", password="test-password")
        cls.outsider = User.objects.create_user("committee-outsider", password="test-password")
        for user, role in ((cls.expert,"expert"),(cls.cp,"cp"),(cls.chair,"chair"),(cls.board,"board")):
            CommitteeMembership.objects.create(target=cls.target, user=user, role=role)
        cls.evaluation = EvidenceEvaluation.objects.create(
            target=cls.target, status="demo",
            outputs={"P_Pathway":25.0}, algorithm_version="linear-normalization-v1",
            parameters={}, provenance=[], content_sha256="a"*64,
        )
        cls.real_eval = EvidenceEvaluation.objects.create(
            target=cls.other, status="approved",
            outputs={"P_Source":25.0}, algorithm_version="linear-normalization-v1",
            parameters={}, provenance=[], content_sha256="b"*64,
        )

    def url(self, sub=""):
        return "/api/targets/T-001/committee/" + sub

    def sign_in(self, user):
        self.client.force_authenticate(user=user)

    def test_membership_controls_reads_and_project_isolation(self):
        self.assertEqual(self.client.get(self.url()).status_code, 403)
        self.sign_in(self.outsider)
        self.assertEqual(self.client.get(self.url()).status_code, 403)
        self.sign_in(self.expert)
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["roles"], ["expert"])
        self.assertEqual(self.client.get("/api/targets/T-002/committee/").status_code, 403)

    def test_override_proposal_requires_evidence_and_independent_review(self):
        from .models import ExpertOverride
        self.sign_in(self.expert)
        payload = dict(
            factor="P_Pathway", delta_points=15, justification="Microscopy confirms contact metamorphism with skarn alteration.",
            evidence_reference="LAB-CU-AU-001",
            evidence_sha256="b"*64,
        )
        response = self.client.post(self.url("overrides/"),payload,format="json")
        self.assertEqual(response.status_code,201,response.data)
        self.assertEqual(response.data["base_score"],25)
        self.assertEqual(response.data["adjusted_score"],40)
        obj=ExpertOverride.objects.get(pk=response.data["id"])
        self.assertEqual(obj.status,"proposed")
        self.sign_in(self.cp)
        reviewed=self.client.post(self.url(f"overrides/{obj.pk}/review/"),{
            "decision":"approved","note":"Reviewed and agree with evidence under independent evaluation."
        },format="json")
        self.assertEqual(reviewed.status_code,409)
        rejected=self.client.post(self.url(f"overrides/{obj.pk}/review/"),{
            "decision":"rejected","note":"Synthetic model cannot provide an approved adjustment."
        },format="json")
        self.assertEqual(rejected.status_code,200)
        self.assertEqual(rejected.data["status"],"rejected")
        self.assertTrue(AuditEvent.objects.filter(action="expert_override_rejected",entity_id=str(obj.pk)).exists())

    def test_overrides_validate_bounded_delta_and_hash(self):
        self.sign_in(self.expert)
        body=dict(factor="P_Pathway",delta_points=100,justification="This is a long enough geological evidence rationale.",
                  evidence_reference="LAB-001",evidence_sha256="b"*64)
        self.assertEqual(self.client.post(self.url("overrides/"),body,format="json").status_code,400)
        body["delta_points"]=15
        body["evidence_sha256"]="not-a-hash"
        self.assertEqual(self.client.post(self.url("overrides/"),body,format="json").status_code,400)

    def test_fatal_flaw_and_prerequisite_block_go(self):
        from .models import StrategicProjectFlag
        self.sign_in(self.expert)
        payload={"kind":"fatal_flaw","title":"Arsenic-rich refractory ore",
                 "rationale":"Requires autoclave testing and comprehensive metallurgical review.",
                 "evidence_reference":"LAB-ARSENIC-2026","gate":1}
        res=self.client.post(self.url("flags/"),payload,format="json")
        self.assertEqual(res.status_code,201,res.data)
        self.assertTrue(StrategicProjectFlag.objects.filter(target=self.target,kind="fatal_flaw",status="open").exists())
        self.sign_in(self.board)
        resp=self.client.post(self.url("gate-decisions/"),{"gate":1,"outcome":"GO",
             "rationale":"The technical board has reviewed this matter thoroughly."},format="json")
        self.assertEqual(resp.status_code,409)
        self.assertIn("unresolved_strategic_blockers",resp.data["blockers"])
        self.sign_in(self.cp)
        self.assertEqual(self.client.post(self.url(f"flags/{res.data['id']}/resolve/"),{
            "note":"Metallurgical follow-up completed and supporting analysis checked independently."
        },format="json").status_code,200)

    def test_memo_versioning_and_no_demo_signature(self):
        from .models import ExecutiveCommitteeMemo
        self.sign_in(self.expert)
        body="Technical review concludes the skarn contact hypothesis requires additional confirmation drilling and validated laboratory work."
        a=self.client.post(self.url("memos/"),{"gate":1,"body":body},format="json")
        b=self.client.post(self.url("memos/"),{"gate":1,"body":body+" New revision."},format="json")
        self.assertEqual((a.status_code,b.status_code),(201,201))
        self.assertEqual((a.data["version"],b.data["version"]),(1,2))
        self.assertEqual(ExecutiveCommitteeMemo.objects.count(),2)
        self.sign_in(self.chair)
        s=self.client.post(self.url(f"memos/{b.data['id']}/sign/"),{
            "attestation":"I have independently reviewed this committee memo and evidence."
        },format="json")
        self.assertEqual(s.status_code,409)
        self.assertEqual(ExecutiveCommitteeMemo.objects.filter(signed_at__isnull=False).count(),0)
        self.sign_in(self.board)
        decision=self.client.post(self.url("gate-decisions/"),{
            "gate":1,"outcome":"HOLD","rationale":"Board requests additional confirmatory drilling before further approval."
        },format="json")
        self.assertEqual(decision.status_code,201,decision.data)
        self.assertTrue(AuditEvent.objects.filter(action="committee_gate_decision").exists())

    def test_project_membership_cannot_be_assumed_from_global_role(self):
        User=get_user_model()
        global_cp=User.objects.create_user("global-cp",password="test-password")
        Group.objects.get_or_create(name="competent_person")[0].user_set.add(global_cp)
        self.sign_in(global_cp)
        self.assertEqual(self.client.get(self.url()).status_code,403)
        self.assertEqual(self.client.post(self.url("flags/"),{},format="json").status_code,403)
