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


# Rules and evaluation runs are separate from the presentation-only EvidenceFactor
# table. They never silently overwrite Gate 1's existing scenario sliders.
class EvidenceFactorRule(models.Model):
    FACTORS = [
        ("P_Source", "P Source"), ("P_Pathway", "P Pathway"),
        ("P_Trap", "P Trap"), ("P_Timing", "P Timing"),
    ]
    connection = models.ForeignKey(SourceConnection, on_delete=models.PROTECT, related_name="factor_rules")
    factor = models.CharField(max_length=24, choices=FACTORS)
    metric_key = models.CharField(max_length=80, help_text="Numeric top-level key from SourceDataSnapshot.values")
    version = models.PositiveIntegerField(default=1)
    input_min = models.FloatField()
    input_max = models.FloatField()
    output_min = models.FloatField(default=0)
    output_max = models.FloatField(default=100)
    weight = models.FloatField(default=1.0)
    is_enabled = models.BooleanField(default=True)
    is_demonstration = models.BooleanField(default=True)
    rationale = models.TextField(help_text="Methodology and calibration evidence, or explicit demo disclaimer")
    approved_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.PROTECT)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["connection", "factor", "metric_key", "version"],
                name="unique_versioned_factor_rule",
            ),
        ]
        ordering = ["connection_id", "factor", "version"]

    def clean(self):
        import math
        from django.core.exceptions import ValidationError
        if not all(math.isfinite(x) for x in (
            self.input_min, self.input_max, self.output_min, self.output_max, self.weight,
        )):
            raise ValidationError("Rule parameters must be finite.")
        if self.input_max <= self.input_min or self.output_max < self.output_min:
            raise ValidationError("Rule ranges must be ordered, with input max greater than min.")
        if self.weight <= 0 or self.weight > 1:
            raise ValidationError("Weight must be greater than zero and at most one.")
        if self.approved_by_id and self.is_demonstration:
            raise ValidationError("Demonstration rules cannot be approved for real evaluations.")
        if not self.rationale.strip():
            raise ValidationError("A documented rule rationale is required.")

    def __str__(self):
        return f"{self.connection}: {self.factor} ({self.metric_key}) v{self.version}"


class EvidenceEvaluation(models.Model):
    STATUS = [
        ("demo", "Synthetic/unverified example"),
        ("incomplete", "Insufficient evidence"),
        ("pending", "Pending competent-person review"),
        ("approved", "Approved after expert review"),
    ]
    target = models.ForeignKey(Target, on_delete=models.PROTECT, related_name="evidence_evaluations")
    algorithm_version = models.CharField(max_length=40, default="linear-normalization-v1")
    parameters = models.JSONField(default=dict)
    outputs = models.JSONField(default=dict)
    provenance = models.JSONField(default=dict)
    content_sha256 = models.CharField(max_length=64)
    status = models.CharField(max_length=16, choices=STATUS, default="incomplete")
    created_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.PROTECT, related_name="created_evidence_evaluations")
    created_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.PROTECT, related_name="approved_evidence_evaluations")
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class EvidenceEvaluationInput(models.Model):
    evaluation = models.ForeignKey(EvidenceEvaluation, on_delete=models.PROTECT, related_name="inputs")
    snapshot = models.ForeignKey(SourceDataSnapshot, on_delete=models.PROTECT)
    rule = models.ForeignKey(EvidenceFactorRule, on_delete=models.PROTECT)
    frozen_rule = models.JSONField(default=dict)
    snapshot_sha256 = models.CharField(max_length=64)
    observed_value = models.FloatField()
    normalized_score = models.FloatField()
    weighted_score = models.FloatField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["evaluation", "rule"], name="unique_eval_input_rule"),
        ]


class CommitteeMembership(models.Model):
    """Target-scoped RBAC; global Django groups never imply committee access."""
    ROLES = [
        ("expert", "Technical expert"), ("cp", "Competent / qualified person"),
        ("chair", "Technical committee chair"), ("board", "Board decision maker"),
        ("auditor", "Read-only auditor"),
    ]
    target = models.ForeignKey(Target, on_delete=models.PROTECT, related_name="committee_memberships")
    user = models.ForeignKey("auth.User", on_delete=models.PROTECT, related_name="committee_memberships")
    role = models.CharField(max_length=12, choices=ROLES)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["target", "user", "role"], name="uniq_committee_membership")]
        ordering = ["target_id", "role", "user_id"]


class ExpertOverride(models.Model):
    """Proposal is immutable by API after submission; no automatic PoS overwrite."""
    STATUSES = [("proposed", "Proposed"), ("approved", "Approved"), ("rejected", "Rejected")]
    target = models.ForeignKey(Target, on_delete=models.PROTECT, related_name="expert_overrides")
    evaluation = models.ForeignKey(EvidenceEvaluation, on_delete=models.PROTECT, related_name="expert_overrides")
    factor = models.CharField(max_length=24, choices=EvidenceFactorRule.FACTORS)
    base_score = models.FloatField()
    delta_points = models.FloatField(help_text="Additive percentage-point change, not relative percent.")
    adjusted_score = models.FloatField()
    justification = models.TextField()
    evidence_reference = models.CharField(max_length=240, help_text="Document URI or evidence record identifier; never store credentials.")
    evidence_sha256 = models.CharField(max_length=64, help_text="SHA-256 supplied by author for external document")
    status = models.CharField(max_length=12, choices=STATUSES, default="proposed")
    proposed_by = models.ForeignKey("auth.User", on_delete=models.PROTECT, related_name="proposed_overrides")
    proposed_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey("auth.User", on_delete=models.PROTECT, null=True, blank=True, related_name="reviewed_overrides")
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-proposed_at", "-id"]


class StrategicProjectFlag(models.Model):
    KINDS = [("catalyst", "Value catalyst"), ("fatal_flaw", "Fatal flaw"), ("prerequisite", "Gate prerequisite")]
    STATUSES = [("open", "Open"), ("resolved", "Resolved")]
    target = models.ForeignKey(Target, on_delete=models.PROTECT, related_name="committee_flags")
    kind = models.CharField(max_length=16, choices=KINDS)
    title = models.CharField(max_length=180)
    rationale = models.TextField()
    evidence_reference = models.CharField(max_length=240)
    gate = models.PositiveSmallIntegerField(default=1, help_text="Stage gate affected, 1-4")
    status = models.CharField(max_length=12, choices=STATUSES, default="open")
    created_by = models.ForeignKey("auth.User", on_delete=models.PROTECT, related_name="authored_flags")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.PROTECT, related_name="resolved_flags")
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class ExecutiveCommitteeMemo(models.Model):
    """Immutable versioned content; sign-off is authenticated attestation, not PKI."""
    target = models.ForeignKey(Target, on_delete=models.PROTECT, related_name="committee_memos")
    evaluation = models.ForeignKey(EvidenceEvaluation, on_delete=models.PROTECT, related_name="committee_memos")
    gate = models.PositiveSmallIntegerField(default=1)
    version = models.PositiveIntegerField()
    body = models.TextField()
    body_sha256 = models.CharField(max_length=64)
    created_by = models.ForeignKey("auth.User", on_delete=models.PROTECT, related_name="authored_committee_memos")
    created_at = models.DateTimeField(auto_now_add=True)
    signed_by = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.PROTECT, related_name="signed_committee_memos")
    signed_at = models.DateTimeField(null=True, blank=True)
    signing_attestation = models.CharField(max_length=240, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["target", "gate", "version"], name="uniq_committee_memo_version")]
        ordering = ["-created_at", "-id"]


class CommitteeGateDecision(models.Model):
    """Target-scoped voting record; separate from the existing program-level FID."""
    target = models.ForeignKey(Target, on_delete=models.PROTECT, related_name="committee_gate_decisions")
    gate = models.PositiveSmallIntegerField(default=1)
    outcome = models.CharField(max_length=10, choices=[("GO", "GO"), ("HOLD", "HOLD"), ("REVIEW", "REVIEW")])
    rationale = models.TextField()
    evaluation = models.ForeignKey(EvidenceEvaluation, on_delete=models.PROTECT)
    memo = models.ForeignKey(ExecutiveCommitteeMemo, on_delete=models.PROTECT)
    decided_by = models.ForeignKey("auth.User", on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]


class ReserveReviewComment(models.Model):
    """Append-only Gate 2 discussion scoped to a target and authenticated author."""
    target = models.ForeignKey(Target, on_delete=models.PROTECT, related_name="reserve_review_comments")
    author = models.ForeignKey("auth.User", on_delete=models.PROTECT, related_name="reserve_review_comments")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
