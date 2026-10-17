from django.contrib import admin
from .models import AssayBatch, Drillhole, Element, EvidenceFactor, OperationProgram, QAQCIssue, Target, WorkTask

admin.site.register([Target, Drillhole, Element, EvidenceFactor, OperationProgram, AssayBatch, QAQCIssue, WorkTask])
