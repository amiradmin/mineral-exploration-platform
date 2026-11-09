from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APITestCase

from .models import CommitteeMembership, SourceConnection, SourceDataSnapshot, Target
from django.utils import timezone


class ReserveSourceReadinessTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        cls.target = Target.objects.get(pk="T-001")
        cls.viewer = get_user_model().objects.create_user(username="source-viewer", password="test-password")
        cls.other = get_user_model().objects.create_user(username="source-outsider", password="test-password")
        CommitteeMembership.objects.create(target=cls.target, user=cls.viewer, role="expert")

    def test_anonymous_and_outsider_cannot_read(self):
        url = "/api/targets/T-001/reserve-sources/"
        self.assertIn(self.client.get(url).status_code, (401, 403))
        self.client.force_authenticate(user=self.other)
        self.assertEqual(self.client.get(url).status_code, 403)

    def test_no_vendor_connection_is_not_reported_as_live(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.get("/api/targets/T-001/reserve-sources/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["sources"]), 4)
        self.assertFalse(response.data["all_inputs_present"])
        self.assertFalse(response.data["validated_resource_estimate"])
        self.assertFalse(response.data["validated_ore_reserve"])
        by_key = {item["key"]: item for item in response.data["sources"]}
        self.assertEqual(by_key["surpac"]["status"], "not_configured")
        self.assertIsNone(by_key["surpac"]["snapshot"])

    def test_real_snapshot_is_only_field_completeness_not_validation(self):
        connection = SourceConnection.objects.create(
            target=self.target, software_key="surpac",
            protocol="file", status="connected", data_format="JSON metadata", is_demo=False,
        )
        SourceDataSnapshot.objects.create(
            connection=connection, dataset="block-2026-11", observed_at=timezone.now(),
            values={"cell_dimensions": [10, 10, 5], "lithology_codes": {"1": "porphyry"}, "bulk_density": 2.7},
        )
        self.client.force_authenticate(user=self.viewer)
        data = self.client.get("/api/targets/T-001/reserve-sources/").data
        surpac = next(item for item in data["sources"] if item["key"] == "surpac")
        self.assertTrue(surpac["input_completeness"])
        self.assertEqual(surpac["missing_fields"], [])
        self.assertFalse(data["all_inputs_present"])
        self.assertFalse(data["validated_resource_estimate"])
        self.assertFalse(data["validated_ore_reserve"])

    def test_demo_snapshot_does_not_count_as_non_demo_input(self):
        connection = SourceConnection.objects.create(
            target=self.target, software_key="geobank", protocol="csv",
            status="configured", is_demo=True,
        )
        SourceDataSnapshot.objects.create(
            connection=connection, dataset="synthetic", observed_at=timezone.now(),
            values={"core_recovery": 96, "rqd": 74, "downhole_surveys": []},
        )
        self.client.force_authenticate(user=self.viewer)
        data = self.client.get("/api/targets/T-001/reserve-sources/").data
        self.assertFalse(data["input_completeness"]["core_logging"])
        self.assertTrue(next(item for item in data["sources"] if item["key"] == "geobank")["input_completeness"])
