from django.db import migrations,models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[("exploration","0012_risk_sources")]
    operations=[
        migrations.CreateModel(name="LegalContract",fields=[
            ("id",models.BigAutoField(primary_key=True,serialize=False)),
            ("filename",models.CharField(max_length=240)),
            ("sha256",models.CharField(max_length=64)),
            ("extracted_text",models.TextField(help_text="Text extraction only; image-only PDFs require external OCR.")),
            ("findings",models.JSONField(default=list)),
            ("clauses_checked",models.JSONField(default=list)),
            ("status",models.CharField(max_length=16,choices=[("draft","Draft"),("reviewed","Reviewed")],default="draft")),
            ("reviewed_at",models.DateTimeField(null=True,blank=True)),
            ("created_at",models.DateTimeField(auto_now_add=True)),
            ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="uploaded_legal_contracts",to="auth.user")),
            ("reviewed_by",models.ForeignKey(null=True,blank=True,on_delete=django.db.models.deletion.PROTECT,related_name="reviewed_legal_contracts",to="auth.user")),
            ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="legal_contracts",to="exploration.target")),
        ],options={"ordering":["-created_at","-id"]}),
        migrations.CreateModel(name="CommercialScenarioRun",fields=[
            ("id",models.BigAutoField(primary_key=True,serialize=False)),
            ("assumptions",models.JSONField(default=dict)),
            ("source_refs",models.JSONField(default=dict)),
            ("result",models.JSONField(default=dict)),
            ("is_illustrative",models.BooleanField(default=True)),
            ("model_version",models.CharField(max_length=48,default="partnership-dcf-v1")),
            ("created_at",models.DateTimeField(auto_now_add=True)),
            ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to="auth.user")),
            ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="commercial_scenarios",to="exploration.target")),
        ],options={"ordering":["-created_at","-id"]}),
    ]
