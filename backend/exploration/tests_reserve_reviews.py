from django.contrib.auth import get_user_model
from django.core.management import call_command
from rest_framework.test import APITestCase

from .models import AuditEvent, CommitteeMembership, ReserveReviewComment, Target


class ReserveReviewCommentTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo")
        cls.target = Target.objects.get(pk="T-001")
        cls.other = Target.objects.get(pk="T-002")
        User = get_user_model()
        cls.chief = User.objects.create_user(username="chief-reviewer", password="test-password")
        cls.auditor = User.objects.create_user(username="reserve-auditor", password="test-password")
        cls.outsider = User.objects.create_user(username="reserve-outsider", password="test-password")
        CommitteeMembership.objects.create(target=cls.target, user=cls.chief, role="chair")
        CommitteeMembership.objects.create(target=cls.target, user=cls.auditor, role="auditor")
        CommitteeMembership.objects.create(target=cls.other, user=cls.outsider, role="expert")

    def test_anonymous_cannot_read_or_write(self):
        url = "/api/targets/T-001/reserve-reviews/comments/"
        self.assertIn(self.client.get(url).status_code, (401, 403))
        self.assertIn(self.client.post(url, {"body": "Review this model"}, format="json").status_code, (401, 403))

    def test_chair_can_post_and_records_author_and_audit(self):
        self.client.force_authenticate(user=self.chief)
        url = "/api/targets/T-001/reserve-reviews/comments/"
        response = self.client.post(url, {"body": "  Please verify continuity assumptions.  "}, format="json")
        self.assertEqual(response.status_code, 201)
        item = ReserveReviewComment.objects.get()
        self.assertEqual(item.body, "Please verify continuity assumptions.")
        self.assertEqual(item.author, self.chief)
        self.assertTrue(AuditEvent.objects.filter(action="reserve_review_comment_created", entity_id=str(item.pk)).exists())
        result = self.client.get(url)
        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.data["can_comment"])
        self.assertEqual(result.data["comments"][0]["author"], "chief-reviewer")

    def test_auditor_read_only_and_target_isolation(self):
        url = "/api/targets/T-001/reserve-reviews/comments/"
        self.client.force_authenticate(user=self.auditor)
        self.assertEqual(self.client.get(url).status_code, 200)
        self.assertEqual(self.client.post(url, {"body": "Should be denied"}, format="json").status_code, 403)
        self.client.force_authenticate(user=self.outsider)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.post(url, {"body": "Should be denied"}, format="json").status_code, 403)

    def test_rejects_empty_or_oversized_comments(self):
        self.client.force_authenticate(user=self.chief)
        url = "/api/targets/T-001/reserve-reviews/comments/"
        for body in ("", "ab", "x" * 4001):
            self.assertEqual(self.client.post(url, {"body": body}, format="json").status_code, 400)
        self.assertEqual(ReserveReviewComment.objects.count(), 0)
