from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create the governance roles used for protected API writes and gate decisions."

    def handle(self, *args, **options):
        for name in ("data_steward", "board_approver", "geologist", "competent_person", "finance_reviewer", "legal_reviewer"):
            Group.objects.get_or_create(name=name)
            self.stdout.write(self.style.SUCCESS(f"Role available: {name}"))
