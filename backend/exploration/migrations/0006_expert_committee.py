from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("exploration", "0005_evidence_lineage"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="CommitteeMembership",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("role", models.CharField(choices=[("expert","Technical expert"),("cp","Competent / qualified person"),("chair","Technical committee chair"),("board","Board decision maker"),("auditor","Read-only auditor")], max_length=12)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("target", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="committee_memberships", to="exploration.target")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="committee_memberships", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering":["target_id","role","user_id"]},
        ),
        migrations.AddConstraint(model_name="committeemembership", constraint=models.UniqueConstraint(fields=("target","user","role"),name="uniq_committee_membership")),
        migrations.CreateModel(
            name="ExpertOverride",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("factor",models.CharField(choices=[("P_Source","P Source"),("P_Pathway","P Pathway"),("P_Trap","P Trap"),("P_Timing","P Timing")],max_length=24)),
                ("base_score",models.FloatField()),
                ("delta_points",models.FloatField(help_text="Additive percentage-point change, not relative percent.")),
                ("adjusted_score",models.FloatField()),
                ("justification",models.TextField()),
                ("evidence_reference",models.CharField(help_text="Document URI or evidence record identifier; never store credentials.",max_length=240)),
                ("evidence_sha256",models.CharField(help_text="SHA-256 supplied by author for external document",max_length=64)),
                ("status",models.CharField(choices=[("proposed","Proposed"),("approved","Approved"),("rejected","Rejected")],default="proposed",max_length=12)),
                ("proposed_at",models.DateTimeField(auto_now_add=True)),
                ("reviewed_at",models.DateTimeField(blank=True,null=True)),
                ("review_note",models.TextField(blank=True)),
                ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="expert_overrides",to="exploration.target")),
                ("evaluation",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="expert_overrides",to="exploration.evidenceevaluation")),
                ("proposed_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="proposed_overrides",to=settings.AUTH_USER_MODEL)),
                ("reviewed_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="reviewed_overrides",to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering":["-proposed_at","-id"]},
        ),
        migrations.CreateModel(
            name="StrategicProjectFlag",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("kind",models.CharField(choices=[("catalyst","Value catalyst"),("fatal_flaw","Fatal flaw"),("prerequisite","Gate prerequisite")],max_length=16)),
                ("title",models.CharField(max_length=180)),
                ("rationale",models.TextField()),
                ("evidence_reference",models.CharField(max_length=240)),
                ("gate",models.PositiveSmallIntegerField(default=1,help_text="Stage gate affected, 1-4")),
                ("status",models.CharField(choices=[("open","Open"),("resolved","Resolved")],default="open",max_length=12)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("resolved_at",models.DateTimeField(blank=True,null=True)),
                ("resolution_note",models.TextField(blank=True)),
                ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="committee_flags",to="exploration.target")),
                ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="authored_flags",to=settings.AUTH_USER_MODEL)),
                ("resolved_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="resolved_flags",to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering":["-created_at","-id"]},
        ),
        migrations.CreateModel(
            name="ExecutiveCommitteeMemo",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("gate",models.PositiveSmallIntegerField(default=1)),
                ("version",models.PositiveIntegerField()),
                ("body",models.TextField()),
                ("body_sha256",models.CharField(max_length=64)),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("signed_at",models.DateTimeField(blank=True,null=True)),
                ("signing_attestation",models.CharField(blank=True,max_length=240)),
                ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="committee_memos",to="exploration.target")),
                ("evaluation",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="committee_memos",to="exploration.evidenceevaluation")),
                ("created_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="authored_committee_memos",to=settings.AUTH_USER_MODEL)),
                ("signed_by",models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.PROTECT,related_name="signed_committee_memos",to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering":["-created_at","-id"]},
        ),
        migrations.AddConstraint(model_name="executivecommitteememo",constraint=models.UniqueConstraint(fields=("target","gate","version"),name="uniq_committee_memo_version")),
        migrations.CreateModel(
            name="CommitteeGateDecision",
            fields=[
                ("id",models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name="ID")),
                ("gate",models.PositiveSmallIntegerField(default=1)),
                ("outcome",models.CharField(choices=[("GO","GO"),("HOLD","HOLD"),("REVIEW","REVIEW")],max_length=10)),
                ("rationale",models.TextField()),
                ("created_at",models.DateTimeField(auto_now_add=True)),
                ("target",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,related_name="committee_gate_decisions",to="exploration.target")),
                ("evaluation",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to="exploration.evidenceevaluation")),
                ("memo",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to="exploration.executivecommitteememo")),
                ("decided_by",models.ForeignKey(on_delete=django.db.models.deletion.PROTECT,to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering":["-created_at","-id"]},
        ),
    ]
