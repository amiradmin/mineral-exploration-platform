from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import AuditEvent, EvidenceReadiness, GateDecision, OperationProgram, SourceConnection, SourceDataSnapshot, Target, WorkTask


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
