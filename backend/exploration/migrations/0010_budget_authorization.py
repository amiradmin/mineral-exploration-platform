from django.db import migrations,models
import django.db.models.deletion
class Migration(migrations.Migration):
    dependencies=[("exploration","0009_engineering_evidence")]
    operations=[migrations.CreateModel(name="BudgetAuthorization",fields=[
        ("id",models.BigAutoField(primary_key=True,serialize=False)),
        ("category",models.CharField(max_length=20,choices=[("exploration","Exploration / infill drilling"),("construction","Construction / development CAPEX")])),
        ("amount_usd",models.DecimalField(max_digits=18,decimal_places=2)),
        ("rationale",models.TextField()),
        ("created_at",models.DateTimeField(auto_now_add=True)),
        ("approver",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to="auth.user")),
        ("program",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="budget_authorizations",to="exploration.operationprogram")),
    ],options={"ordering":["-created_at","-id"]})]
