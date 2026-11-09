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
