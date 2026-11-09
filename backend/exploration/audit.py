from .models import AuditEvent


class AuditedModelViewSetMixin:
    """Write audit events transactionally for ordinary CRUD mutations."""
    def perform_create(self, serializer):
        from django.db import transaction
        with transaction.atomic():
            instance = serializer.save()
            AuditEvent.objects.create(actor=self.request.user, action="create", entity_type=type(instance).__name__, entity_id=str(instance.pk))

    def perform_update(self, serializer):
        from django.db import transaction
        with transaction.atomic():
            instance = serializer.save()
            AuditEvent.objects.create(actor=self.request.user, action="update", entity_type=type(instance).__name__, entity_id=str(instance.pk))

    def perform_destroy(self, instance):
        from django.db import transaction
        with transaction.atomic():
            AuditEvent.objects.create(actor=self.request.user, action="delete", entity_type=type(instance).__name__, entity_id=str(instance.pk))
            instance.delete()
