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
