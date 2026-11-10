from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies=[("exploration","0013_legal_commercial")]
    operations=[
        migrations.AlterField(model_name="committeemembership",name="role",
          field=models.CharField(max_length=12,choices=[
            ("expert","Technical expert"),("cp","Competent / qualified person"),
            ("chair","Technical committee chair"),("board","Board decision maker"),
            ("auditor","Read-only auditor"),("legal","Legal counsel / contract reviewer"),
          ]))
    ]
