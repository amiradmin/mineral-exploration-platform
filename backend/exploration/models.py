from django.db import models


class Target(models.Model):
    priority_choices = [("Very High", "Very High"), ("High", "High"), ("Moderate", "Moderate")]

    id = models.CharField(primary_key=True, max_length=16)
    name = models.CharField(max_length=120)
    commodity = models.CharField(max_length=80)
    deposit = models.CharField(max_length=120)
    ai_score = models.PositiveSmallIntegerField()
    confidence = models.PositiveSmallIntegerField()
    completeness = models.PositiveSmallIntegerField()
    priority = models.CharField(max_length=16, choices=priority_choices)
    stage = models.CharField(max_length=80)
    action = models.CharField(max_length=160)
    x = models.DecimalField(max_digits=5, decimal_places=2)
    y = models.DecimalField(max_digits=5, decimal_places=2)
    rationale = models.TextField()
    evidence = models.JSONField(default=list)

    class Meta:
        ordering = ["-ai_score"]

    def __str__(self):
        return f"{self.id} · {self.name}"


class Drillhole(models.Model):
    status_choices = [("Complete", "Complete"), ("Drilling", "Drilling"), ("Planned", "Planned")]

    id = models.CharField(primary_key=True, max_length=16)
    depth = models.PositiveIntegerField(help_text="Depth in metres")
    azimuth = models.PositiveSmallIntegerField()
    dip = models.SmallIntegerField()
    status = models.CharField(max_length=20, choices=status_choices)
    intercept = models.CharField(max_length=120, blank=True)

    class Meta:
        ordering = ["id"]


class Element(models.Model):
    symbol = models.CharField(primary_key=True, max_length=8)
    name = models.CharField(max_length=50)
    anomalies = models.PositiveIntegerField()

    class Meta:
        ordering = ["-anomalies"]


class EvidenceFactor(models.Model):
    label = models.CharField(max_length=80, unique=True)
    value = models.PositiveSmallIntegerField()
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]


class OperationProgram(models.Model):
    name = models.CharField(max_length=120, unique=True)
    commodity = models.CharField(max_length=40)
    rigs = models.PositiveSmallIntegerField()
    planned_metres = models.PositiveIntegerField()
    actual_metres = models.PositiveIntegerField()
    logged_metres = models.PositiveIntegerField()
    core_recovery = models.DecimalField(max_digits=5, decimal_places=2)
    samples = models.PositiveIntegerField()
    pending_assays = models.PositiveIntegerField()
    budget_used = models.PositiveSmallIntegerField(help_text="Percent")
    target_count = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["name"]


class AssayBatch(models.Model):
    status_choices = [("Overdue", "Overdue"), ("In laboratory", "In laboratory"), ("Received", "Received"), ("Validated", "Validated")]

    id = models.CharField(primary_key=True, max_length=20)
    program = models.ForeignKey(OperationProgram, on_delete=models.PROTECT, related_name="assay_batches")
    batch = models.CharField(max_length=30, unique=True)
    samples = models.PositiveIntegerField()
    due_date = models.DateField()
    status = models.CharField(max_length=30, choices=status_choices)
    qa_status = models.CharField(max_length=30)

    class Meta:
        ordering = ["due_date", "id"]


class QAQCIssue(models.Model):
    severity_choices = [("High", "High"), ("Medium", "Medium")]
    status_choices = [("Open", "Open"), ("Review", "Review"), ("Resolved", "Resolved")]

    id = models.CharField(primary_key=True, max_length=20)
    program = models.ForeignKey(OperationProgram, on_delete=models.PROTECT, related_name="qaqc_issues")
    category = models.CharField(max_length=180)
    severity = models.CharField(max_length=20, choices=severity_choices)
    owner = models.CharField(max_length=120)
    status = models.CharField(max_length=20, choices=status_choices)

    class Meta:
        ordering = ["id"]


class WorkTask(models.Model):
    priority_choices = [("Urgent", "Urgent"), ("High", "High"), ("Normal", "Normal")]

    name = models.CharField(max_length=180, unique=True)
    team = models.CharField(max_length=100)
    program = models.ForeignKey(OperationProgram, on_delete=models.PROTECT, related_name="tasks")
    priority = models.CharField(max_length=20, choices=priority_choices)
    done = models.BooleanField(default=False)

    class Meta:
        ordering = ["priority", "name"]


class EvidenceReadiness(models.Model):
    """Conservative evidence attestation for investment gate eligibility."""
    VERIFIED = "verified"
    STATUS_CHOICES = [("demo", "Demo"), ("unverified", "Unverified"), (VERIFIED, "Verified")]
    program = models.OneToOneField(OperationProgram, on_delete=models.PROTECT, related_name="readiness")
    data_status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="demo")
    detailed_exploration = models.BooleanField(default=False)
    qaqc_approved = models.BooleanField(default=False)
    competent_person_approved = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.program}: {self.data_status}"


class GateDecision(models.Model):
    GATES = [(1, "Screening"), (2, "Drilling"), (3, "Feasibility"), (4, "FID")]
    program = models.ForeignKey(OperationProgram, on_delete=models.PROTECT, related_name="gate_decisions")
    gate = models.PositiveSmallIntegerField(choices=GATES)
    outcome = models.CharField(max_length=16, choices=[("GO", "GO"), ("HOLD", "HOLD"), ("REVIEW", "REVIEW")])
    rationale = models.TextField()
    approver = models.ForeignKey("auth.User", on_delete=models.PROTECT)
    policy_version = models.CharField(max_length=24, default="p0-v1")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class AuditEvent(models.Model):
    """Append-only from application API; protect database credentials separately."""
    actor = models.ForeignKey("auth.User", null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=64)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class SourceConnection(models.Model):
    """Recorded (not automatically polled) software integration for an exploration target."""
    PROTOCOLS = [
        ("api", "REST API"), ("csv", "CSV import"),
        ("socket", "Socket"), ("file", "File import"),
        ("ogc", "OGC GIS service"), ("other", "Other"),
    ]
    STATUSES = [
        ("configured", "Configured; not verified"),
        ("connected", "Connected (reported by integrator)"),
        ("error", "Connection error"), ("disabled", "Disabled"),
    ]
    target = models.ForeignKey(Target, on_delete=models.CASCADE, related_name="source_connections")
    software_key = models.CharField(max_length=32)
    protocol = models.CharField(max_length=16, choices=PROTOCOLS)
    data_format = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=16, choices=STATUSES, default="configured")
    is_demo = models.BooleanField(default=False, help_text="Only marked demo sources can be read anonymously.")
    last_checked_at = models.DateTimeField(null=True, blank=True)
    last_success_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["target", "software_key"], name="unique_target_software_source"),
        ]
        ordering = ["target_id", "software_key"]

    def __str__(self):
        return f"{self.target_id} / {self.software_key}"


class SourceDataSnapshot(models.Model):
    """Data actually stored in Data Mine; no assumed vendor live-polling."""
    connection = models.ForeignKey(SourceConnection, on_delete=models.CASCADE, related_name="snapshots")
    dataset = models.CharField(max_length=120)
    observed_at = models.DateTimeField(help_text="Timestamp reported by originating source")
    received_at = models.DateTimeField(auto_now_add=True)
    values = models.JSONField(default=dict, help_text="Safe, sanitized JSON summary; never store credentials")

    class Meta:
        ordering = ["-received_at", "-pk"]

    def __str__(self):
        return f"{self.connection}: {self.dataset}"
