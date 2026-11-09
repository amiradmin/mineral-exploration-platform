from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("exploration", "0003_governance")]

    operations = [
        migrations.CreateModel(
            name="SourceConnection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("software_key", models.CharField(max_length=32)),
                ("protocol", models.CharField(choices=[("api", "REST API"), ("csv", "CSV import"), ("socket", "Socket"), ("file", "File import"), ("ogc", "OGC GIS service"), ("other", "Other")], max_length=16)),
                ("data_format", models.CharField(blank=True, max_length=80)),
                ("status", models.CharField(choices=[("configured", "Configured; not verified"), ("connected", "Connected (reported by integrator)"), ("error", "Connection error"), ("disabled", "Disabled")], default="configured", max_length=16)),
                ("is_demo", models.BooleanField(default=False, help_text="Only marked demo sources can be read anonymously.")),
                ("last_checked_at", models.DateTimeField(blank=True, null=True)),
                ("last_success_at", models.DateTimeField(blank=True, null=True)),
                ("target", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="source_connections", to="exploration.target")),
            ],
            options={"ordering": ["target_id", "software_key"]},
        ),
        migrations.AddConstraint(
            model_name="sourceconnection",
            constraint=models.UniqueConstraint(fields=("target", "software_key"), name="unique_target_software_source"),
        ),
        migrations.CreateModel(
            name="SourceDataSnapshot",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("dataset", models.CharField(max_length=120)),
                ("observed_at", models.DateTimeField(help_text="Timestamp reported by originating source")),
                ("received_at", models.DateTimeField(auto_now_add=True)),
                ("values", models.JSONField(default=dict, help_text="Safe, sanitized JSON summary; never store credentials")),
                ("connection", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="snapshots", to="exploration.sourceconnection")),
            ],
            options={"ordering": ["-received_at", "-pk"]},
        ),
    ]
