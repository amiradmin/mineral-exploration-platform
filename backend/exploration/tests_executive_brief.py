"""Executive board briefing API contract and conservative investment status tests."""
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APITestCase
from .models import (
    Target,OperationProgram,ProgramTarget,CommitteeMembership,GateDecision,
    EvidenceReadiness,DataScaleProfile,EngineeringEvidence,StrategicProjectFlag,
    FinancialSourceSnapshot
)
from django.utils import timezone

class ExecutiveBriefTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.target=Target.objects.create(id="EB-01",name="Board Mine",commodity="Cu",deposit="Porphyry",
            ai_score=91,confidence=79,completeness=75,priority="High",stage="General",
            action="Review",x=50,y=50,rationale="Geology",evidence=[])
        cls.other=Target.objects.create(id="EB-02",name="Private Mine",commodity="Au",deposit="Epithermal",
            ai_score=81,confidence=80,completeness=70,priority="High",stage="General",
            action="Review",x=50,y=50,rationale="Other",evidence=[])
        User=get_user_model()
        cls.member=User.objects.create_user(username="exec-member",password="testpass123")
        cls.nonmember=User.objects.create_user(username="exec-other",password="testpass123")
        CommitteeMembership.objects.create(target=cls.target,user=cls.member,role="board",active=True)
        cls.program=OperationProgram.objects.create(
            name="Board Program",commodity="Cu",rigs=1,planned_metres=1000,
            actual_metres=600,logged_metres=590,core_recovery=95,
            samples=120,pending_assays=1,budget_used=40,target_count=1)

    def test_requires_auth_and_target_membership(self):
        url="/api/targets/EB-01/executive-brief/"
        self.assertIn(self.client.get(url).status_code,(401,403))
        self.client.force_authenticate(user=self.nonmember)
        self.assertEqual(self.client.get(url).status_code,403)
        self.client.force_authenticate(user=self.member)
        self.assertEqual(self.client.get("/api/targets/EB-02/executive-brief/").status_code,403)

    def test_missing_program_never_returns_go_or_financial_npv(self):
        self.client.force_authenticate(user=self.member)
        data=self.client.get("/api/targets/EB-01/executive-brief/")
        self.assertEqual(data.status_code,200,data.data)
        self.assertEqual(data.data["recommendation"],"HOLD")
        self.assertIsNone(data.data["selected_program_id"])
        self.assertIsNone(data.data["financial_summary"]["npv_m"])
        self.assertTrue(data.data["blockers"])
        self.assertFalse(data.data["decision_is_formal"])

    def test_historical_go_never_overrides_newly_missing_evidence(self):
        ProgramTarget.objects.create(program=self.program,target=self.target)
        GateDecision.objects.create(program=self.program,gate=4,outcome="GO",
            approver=self.member,rationale="Prior evidence approved")
        self.client.force_authenticate(user=self.member)
        data=self.client.get("/api/targets/EB-01/executive-brief/")
        self.assertEqual(data.status_code,200,data.data)
        self.assertEqual(data.data["recommendation"],"HOLD")
        self.assertFalse(data.data["fid_eligible"])
        self.assertEqual(data.data["formal_gates"][3]["outcome"],"GO")
        self.assertEqual(data.data["decision_history"][0]["outcome"],"GO")
        self.assertFalse(data.data["decision_is_formal"])

    def test_linked_program_select_rejects_unlinked_program(self):
        ProgramTarget.objects.create(program=self.program,target=self.target)
        self.client.force_authenticate(user=self.member)
        url="/api/targets/EB-01/executive-brief/"
        self.assertEqual(self.client.get(url+"?program_id=99999").status_code,400)
        self.assertEqual(self.client.get(url+"?program_id="+str(self.program.pk)).status_code,200)

    def test_open_fatal_flag_prevents_green_signal(self):
        ProgramTarget.objects.create(program=self.program,target=self.target)
        EvidenceReadiness.objects.create(program=self.program,data_status="verified",
            detailed_exploration=True,qaqc_approved=True,competent_person_approved=True)
        DataScaleProfile.objects.create(target=self.target,phase="detailed",map_scale_denominator=1000,
            sample_count=100,lab_method="ICP-MS",drillhole_count=10,ddh_metres=1200,rc_metres=0,
            grid_spacing_x=50,grid_spacing_y=50,core_recovery_pct=94,rqd_pct=85,verified=True)
        for source,metrics in [
            ("alastri",{"stripping_ratio":2.8,"overall_pit_slope_deg":42}),
            ("datamine",{"annual_ore_tonnes":4000000,"annual_plant_feed_tonnes":3900000}),
            ("rocscience",{"static_fos":1.45})
        ]:
            EngineeringEvidence.objects.create(target=self.target,source=source,source_filename=source+".csv",
                source_format="csv",source_sha256="a"*64,analysis_date=timezone.localdate(),
                model_version="reviewed-v1",metrics=metrics,verified=True,
                reviewed_by=self.member,reviewed_at=timezone.now())
        GateDecision.objects.create(program=self.program,gate=4,outcome="GO",
            approver=self.member,rationale="Approved for financing")
        self.client.force_authenticate(user=self.member)
        url="/api/targets/EB-01/executive-brief/"
        result=self.client.get(url)
        self.assertEqual(result.status_code,200,result.data)
        self.assertEqual(result.data["recommendation"],"GO_RECORDED")
        StrategicProjectFlag.objects.create(target=self.target,kind="fatal_flaw",
            title="Tailings risk",rationale="Potential containment issue",
            evidence_reference="E-01",gate=4,status="open",created_by=self.member)
        result=self.client.get(url)
        self.assertEqual(result.data["recommendation"],"REVIEW")
        self.assertEqual(len(result.data["key_risks"]),1)
