"""Production static configuration contract for Django's admin UI."""
from pathlib import Path
from django.conf import settings
from django.contrib.staticfiles import finders
from django.test import SimpleTestCase

class AdminStaticConfigurationTests(SimpleTestCase):
    def test_admin_base_css_is_available_to_collectstatic(self):
        self.assertIsNotNone(finders.find("admin/css/base.css"))

    def test_production_static_files_are_served_from_collected_directory(self):
        self.assertEqual(settings.STATIC_URL, "/static/")
        self.assertEqual(settings.STATIC_ROOT, settings.BASE_DIR / "staticfiles")
        self.assertIn("whitenoise.middleware.WhiteNoiseMiddleware", settings.MIDDLEWARE)
        self.assertEqual(
            settings.STORAGES["staticfiles"]["BACKEND"],
            "whitenoise.storage.CompressedManifestStaticFilesStorage",
        )
