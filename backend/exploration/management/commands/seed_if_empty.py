from django.core.management import call_command
from django.core.management.base import BaseCommand
from exploration.models import Target, OperationProgram


class Command(BaseCommand):
    help = "Seed a new demo database only; never overwrite existing operational records."

    def handle(self, *args, **options):
        if Target.objects.exists() or OperationProgram.objects.exists():
            self.stdout.write("Existing data detected; skipping demo seed.")
            return
        call_command("seed_demo")
