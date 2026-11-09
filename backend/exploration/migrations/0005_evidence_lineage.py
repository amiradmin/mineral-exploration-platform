from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("exploration", "0004_source_connections"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="EvidenceFactorRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("factor", models.CharField(max_length=24, choices=[("P_Source", "P Source"), ("P_Pathway", "P Pathway"), ("P_Trap", "P Trap"), ("P_Timing", "P Timing")])),
                ("metric_key", models.CharField(max_length=80, help_text="Numeric top-level key from SourceDataSnapshot.values")),
                ("version", models.PositiveIntegerField(default=1)),
                ("input_min", models.FloatField()),
                ("input_max", models.FloatField()),
                ("output_min", models.FloatField(default=0)),
                ("output_max", models.FloatField(default=100)),
                ("weight", models.FloatField(default=1.0)),
                ("is_enabled", models.BooleanField(default=True)),
                ("is_demonstration", models.BooleanField(default=True)),
                ("rationale", models.TextField(help_text="Methodology and calibration evidence, or explicit demo disclaimer")),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL)),
                ("connection", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="factor_rules", to="exploration.sourceconnection")),
            ],
            options={"ordering": ["connection_id", "factor", "version"]},
        ),
        migrations.AddConstraint(
            model_name="evidencefactorrule",
            constraint=models.UniqueConstraint(fields=("connection", "factor", "metric_key", "version"), name="unique_versioned_factor_rule"),
        ),
        migrations.CreateModel(
            name="EvidenceEvaluation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("algorithm_version", models.CharField(default="linear-normalization-v1", max_length=40)),
                ("parameters", models.JSONField(default=dict)),
                ("outputs", models.JSONField(default=dict)),
                ("provenance", models.JSONField(default=dict)),
                ("content_sha256", models.CharField(max_length=64)),
                ("status", models.CharField(choices=[("demo", "Synthetic/unverified example"), ("incomplete", "Insufficient evidence"), ("pending", "Pending competent-person review"), ("approved", "Approved after expert review")], default="incomplete", max_length=16)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="approved_evidence_evaluations", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="created_evidence_evaluations", to=settings.AUTH_USER_MODEL)),
                ("target", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="evidence_evaluations", to="exploration.target")),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="EvidenceEvaluationInput",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("frozen_rule", models.JSONField(default=dict)),
                ("snapshot_sha256", models.CharField(max_length=64)),
                ("observed_value", models.FloatField()),
                ("normalized_score", models.FloatField()),
                ("weighted_score", models.FloatField()),
                ("evaluation", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="inputs", to="exploration.evidenceevaluation")),
                ("rule", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="exploration.evidencefactorrule")),
                ("snapshot", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="exploration.sourcedatasnapshot")),
            ],
        ),
        migrations.AddConstraint(
            model_name="evidenceevaluationinput",
            constraint=models.UniqueConstraint(fields=("evaluation", "rule"), name="unique_eval_input_rule"),
        ),
    ]
