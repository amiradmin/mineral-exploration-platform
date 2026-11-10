from django.db import migrations,models
import django.db.models.deletion
class Migration(migrations.Migration):
    dependencies=[("exploration","0008_data_scale_profile")]
    operations=[
        migrations.CreateModel(name="ProgramTarget",fields=[
            ("id",models.BigAutoField(primary_key=True,serialize=False)),
            ("program",models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name="target_links",to="exploration.operationprogram")),
            ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="program_links",to="exploration.target")),
        ]),
        migrations.AddConstraint(model_name="programtarget",constraint=models.UniqueConstraint(fields=("program","target"),name="unique_program_target")),
        migrations.CreateModel(name="EngineeringEvidence",fields=[
            ("id",models.BigAutoField(primary_key=True,serialize=False)),
            ("source",models.CharField(max_length=24,choices=[("alastri","Alastri / Beyond"),("datamine","Datamine Strategic Planners"),("rocscience","Rocscience Slide2 / Slide3")])),
            ("source_filename",models.CharField(max_length=240)),
            ("source_format",models.CharField(max_length=16,choices=[("csv","CSV"),("dxf","DXF"),("xml","XML"),("json","JSON"),("report","Report")])),
            ("source_sha256",models.CharField(max_length=64,help_text="SHA-256 fingerprint of the originating file")),
            ("analysis_date",models.DateField()),
            ("model_version",models.CharField(max_length=100)),
            ("metrics",models.JSONField(default=dict)),
            ("verified",models.BooleanField(default=False)),
            ("created_at",models.DateTimeField(auto_now_add=True)),
            ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="engineering_evidence",to="exploration.target")),
            ("reviewed_by",models.ForeignKey(null=True,blank=True,on_delete=django.db.models.deletion.PROTECT,related_name="reviewed_engineering_evidence",to="auth.user")),
            ("reviewed_at",models.DateTimeField(null=True,blank=True)),
        ],options={"ordering":["-created_at","-id"]}),
    ]
