from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def enable_postgis(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("CREATE EXTENSION IF NOT EXISTS postgis")


class Migration(migrations.Migration):
    dependencies = [
        ("exploration", "0002_alter_assaybatch_options_alter_qaqcissue_options_and_more"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.RunPython(enable_postgis, reverse_code=migrations.RunPython.noop),
        migrations.CreateModel(
            name="EvidenceReadiness",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("data_status", models.CharField(choices=[("demo", "Demo"), ("unverified", "Unverified"), ("verified", "Verified")], default="demo", max_length=16)),
                ("detailed_exploration", models.BooleanField(default=False)),
                ("qaqc_approved", models.BooleanField(default=False)),
                ("competent_person_approved", models.BooleanField(default=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("program", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="readiness", to="exploration.operationprogram")),
            ],
        ),
        migrations.CreateModel(
            name="GateDecision",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("gate", models.PositiveSmallIntegerField(choices=[(1, "Screening"), (2, "Drilling"), (3, "Feasibility"), (4, "FID")])),
                ("outcome", models.CharField(choices=[("GO", "GO"), ("HOLD", "HOLD"), ("REVIEW", "REVIEW")], max_length=16)),
                ("rationale", models.TextField()),
                ("policy_version", models.CharField(default="p0-v1", max_length=24)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("approver", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                ("program", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="gate_decisions", to="exploration.operationprogram")),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="AuditEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("action", models.CharField(max_length=64)),
                ("entity_type", models.CharField(max_length=100)),
                ("entity_id", models.CharField(max_length=100)),
                ("details", models.JSONField(default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
    ]
