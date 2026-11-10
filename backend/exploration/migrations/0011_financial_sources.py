from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[("exploration","0010_budget_authorization")]
    operations=[migrations.CreateModel(name="FinancialSourceSnapshot",fields=[
        ("id",models.BigAutoField(primary_key=True,serialize=False)),
        ("source",models.CharField(max_length=20,choices=[("minetrust","Datamine MineTrust LOM"),("erp_epc","ERP / EPC Ledger")])),
        ("source_filename",models.CharField(max_length=240)),
        ("source_sha256",models.CharField(max_length=64)),
        ("model_version",models.CharField(max_length=100)),
        ("rows",models.JSONField(default=list)),
        ("reviewed_at",models.DateTimeField(null=True,blank=True)),
        ("created_at",models.DateTimeField(auto_now_add=True)),
        ("reviewed_by",models.ForeignKey(null=True,blank=True,on_delete=django.db.models.deletion.PROTECT,related_name="reviewed_financial_sources",to="auth.user")),
        ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="financial_sources",to="exploration.target")),
    ],options={"ordering":["-created_at","-id"]})]
