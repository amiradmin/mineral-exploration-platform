from django.core.management import call_command
from rest_framework.test import APITestCase
from .models import WorkTask


class ExplorationApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")

    def test_targets_endpoint_returns_seeded_targets(self):
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
        first_batch = response.data["results"][0]
        self.assertIn("project", first_batch)
        self.assertIn("due", first_batch)

    def test_task_state_can_be_persisted(self):
        task = WorkTask.objects.get(name="Verify CU-081 chain of custody")
        response = self.client.patch(f"/api/tasks/{task.pk}/", {"done": True}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["done"])
        task.refresh_from_db()
        self.assertTrue(task.done)
