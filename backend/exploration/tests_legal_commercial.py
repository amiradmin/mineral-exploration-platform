"""Contract audit and commercial-share deterministic pipeline tests."""
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APITestCase
from .models import Target, CommitteeMembership, LegalContract, FinancialSourceSnapshot, CommercialScenarioRun, AuditEvent
from .legal_contracts import screen_text
from .commercial_partnership import annual_model, evaluate, illustrative_sources

class PartnershipMathTests(TestCase):
    def setUp(self):
        self.params={"mine_life":11,"commodity_price_usd_per_t":9200,"metal_recovery_pct":87,
            "operating_cost_usd_per_ore_t":55,"tax_pct":25,"discount_rate_pct":10,
            "min_investor_irr_pct":10,"max_payback_years":6,
            "early_owner_share_pct":15,"late_owner_share_pct":28,"switch_after_year":4}
        self.production,self.capex,_=illustrative_sources(11)
    def test_owner_share_reduces_npv_and_irr(self):
        low=annual_model(self.params,self.production,self.capex,15)
        high=annual_model(self.params,self.production,self.capex,28)
        self.assertGreater(low["npv_m"],high["npv_m"])
        if low["irr_pct"] is not None and high["irr_pct"] is not None:
            self.assertGreater(low["irr_pct"],high["irr_pct"])
    def test_tiered_starts_at_15_and_only_steps_up_after_payback_and_year_four(self):
        result=annual_model(self.params,self.production,self.capex,"tiered")
        self.assertTrue(all(f["owner_share_pct"]==15 for f in result["cash_flows"][1:5]))
        if any(f["owner_share_pct"]==28 for f in result["cash_flows"]):
            self.assertTrue(all(f["year"]>4 for f in result["cash_flows"] if f["owner_share_pct"]==28))
    def test_frontier_hurdle_affects_maximum_owner_share(self):
        first=evaluate(self.params,self.production,self.capex)["maximum_owner_share_pct"]
        stricter={**self.params,"min_investor_irr_pct":40}
        second=evaluate(stricter,self.production,self.capex)["maximum_owner_share_pct"]
        self.assertTrue(second is None or first is None or second<=first)
    def test_contract_clause_results_are_excerpts_not_automatic_legal_opinion(self):
        text="Minimum extraction 5000000 tonnes annually.\nOperator may terminate without cause.\nExchange rate adjustment."
        checks,findings=screen_text(text,capacity=[4000000]*11)
        names={f["code"] for f in findings}
        self.assertIn("minimum_tonnage",names)
        self.assertIn("minimum_tonnage_capacity_check",names)
        self.assertIn("termination_compensation_missing",names)
        self.assertTrue(all(f["status"]!="approved" for f in findings))

class LegalCommercialAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.target=Target.objects.create(id="LC-01",name="Contract Mine",commodity="Cu",deposit="Porphyry",
          ai_score=90,confidence=70,completeness=70,priority="High",stage="General",
          action="Study",x=50,y=50,rationale="Study",evidence=[])
        cls.other=Target.objects.create(id="LC-02",name="Other Mine",commodity="Cu",deposit="Porphyry",
          ai_score=90,confidence=70,completeness=70,priority="High",stage="General",
          action="Study",x=50,y=50,rationale="Study",evidence=[])
        User=get_user_model()
        cls.author=User.objects.create_user(username="legal-author",password="testpass123")
        cls.lawyer=User.objects.create_user(username="legal-lawyer",password="testpass123")
        cls.stranger=User.objects.create_user(username="legal-stranger",password="testpass123")
        CommitteeMembership.objects.create(target=cls.target,user=cls.author,role="expert",active=True)
        CommitteeMembership.objects.create(target=cls.target,user=cls.lawyer,role="legal",active=True)
    def upload_contract(self):
        text=b"Minimum extraction 5000000 tonnes annually.\nUnilateral termination without cause.\nForeign exchange rate changes apply."
        return self.client.post("/api/targets/LC-01/legal-contracts/",{
           "file":SimpleUploadedFile("partnership.txt",text,content_type="text/plain")},format="multipart")
    def test_confidential_upload_audit_and_role_reviewer(self):
        self.client.force_authenticate(user=self.stranger)
        self.assertEqual(self.client.get("/api/targets/LC-01/legal-contracts/").status_code,403)
        self.assertEqual(self.client.post("/api/targets/LC-01/commercial-scenarios/",{},format="json").status_code,403)
        self.client.force_authenticate(user=self.author)
        created=self.upload_contract()
        self.assertEqual(created.status_code,201,created.data)
        contract_id=created.data["id"]
        self.assertTrue(LegalContract.objects.get(pk=contract_id).findings)
        self.assertTrue(AuditEvent.objects.filter(action="contract_uploaded").exists())
        self.assertEqual(self.client.get("/api/targets/LC-02/legal-contracts/").status_code,403)
        review_url=f"/api/targets/LC-01/legal-contracts/{contract_id}/review/"
        self.assertEqual(self.client.post(review_url,{"rationale":"Reviewed contract risks and exceptions"},format="json").status_code,403)
        self.client.force_authenticate(user=self.lawyer)
        result=self.client.post(review_url,{"rationale":"Reviewed legal clauses and commercial exceptions"},format="json")
        self.assertEqual(result.status_code,200,result.data)
        self.assertEqual(result.data["status"],"reviewed")
    def test_illustrative_commercial_run_and_reviewer_source_guard(self):
        self.client.force_authenticate(user=self.author)
        url="/api/targets/LC-01/commercial-scenarios/"
        sample=self.client.post(url,{"save_run":True},format="json")
        self.assertEqual(sample.status_code,200,sample.data)
        self.assertTrue(sample.data["is_illustrative"])
        self.assertEqual(len(sample.data["results"]["comparisons"]),5)
        self.assertTrue(CommercialScenarioRun.objects.filter(target=self.target).exists())
        blocked=self.client.post(url,{"use_reviewed_sources":True},format="json")
        self.assertEqual(blocked.status_code,409)
    def test_reviewed_mine_trust_and_epc_feed_exact_investment_model(self):
        self.client.force_authenticate(user=self.author)
        production=[{"year":year,"ore_tonnes":4000000,"grade_pct":0.84,"plant_feed_tonnes":3900000} for year in range(1,12)]
        ledger=[{"year":0,"category":"plant","amount_usd":240000000},
                {"year":5,"category":"infrastructure","amount_usd":10000000}]
        for source,rows in (("minetrust",production),("erp_epc",ledger)):
            FinancialSourceSnapshot.objects.create(target=self.target,source=source,
                source_filename=source+".csv",source_sha256="a"*64,model_version="test",
                rows=rows,reviewed_by=self.lawyer)
        result=self.client.post("/api/targets/LC-01/commercial-scenarios/",
                {"use_reviewed_sources":True},format="json")
        self.assertEqual(result.status_code,200,result.data)
        self.assertFalse(result.data["is_illustrative"])
        self.assertIn("minetrust",result.data["source_refs"])
        self.assertEqual(result.data["results"]["comparisons"][0]["cash_flows"][5]["capex_m"],10)
