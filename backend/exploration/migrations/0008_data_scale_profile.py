from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    dependencies=[("exploration","0007_reserve_review_comments")]
    operations=[migrations.CreateModel(name="DataScaleProfile",fields=[
        ("target",models.OneToOneField(primary_key=True,serialize=False,on_delete=django.db.models.deletion.CASCADE,related_name="data_scale",to="exploration.target")),
        ("phase",models.CharField(max_length=20,choices=[("reconnaissance","Reconnaissance"),("general","General"),("detailed","Detailed")])),
        ("map_scale_denominator",models.PositiveIntegerField()),
        ("sample_count",models.PositiveIntegerField(default=0)),
        ("lab_method",models.CharField(max_length=160,blank=True)),
        ("drillhole_count",models.PositiveIntegerField(default=0)),
        ("ddh_metres",models.FloatField(default=0)),
        ("rc_metres",models.FloatField(default=0)),
        ("grid_spacing_x",models.FloatField(null=True,blank=True)),
        ("grid_spacing_y",models.FloatField(null=True,blank=True)),
        ("core_recovery_pct",models.FloatField(null=True,blank=True)),
        ("rqd_pct",models.FloatField(null=True,blank=True)),
        ("verified",models.BooleanField(default=False)),
        ("updated_at",models.DateTimeField(auto_now=True)),
    ])]
