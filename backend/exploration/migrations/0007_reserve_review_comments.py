from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("exploration", "0006_expert_committee"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReserveReviewComment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("body", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("author", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="reserve_review_comments", to=settings.AUTH_USER_MODEL)),
                ("target", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="reserve_review_comments", to="exploration.target")),
            ],
            options={"ordering": ["created_at", "id"]},
        ),
    ]
