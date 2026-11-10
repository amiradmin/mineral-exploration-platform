"""Gate 4 strategic co-pilot, financial source and risk source contract tests."""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APITestCase
from .models import Target,FinancialSourceSnapshot,RiskSourceSnapshot
from .strategic_scenarios import calculate,compare,interpret,OPTIONS,DEFAULTS

class StrategicCalculatorTests(TestCase):
    def test_same_inputs_reproduce_same_result_and_comparison_not_sample_npv(self):
        first=compare(DEFAULTS,{})
        self.assertEqual(first,compare(DEFAULTS,{}))
        self.assertEqual(len(first["results"]),3)
        self.assertNotEqual(first["results"][0]["npv"],145.2)
        self.assertEqual(first["results"][0]["annual_flows"][0]["cash_flow"],-100)
    def test_natural_language_extracts_only_whitelisted_fields(self):
        parsed=interpret("Compare fleet replacement every 2 years, mine life 11, discount rate 10%")
        self.assertEqual(parsed["changes"]["rotation_years"],2)
        self.assertEqual(parsed["changes"]["mine_life"],11)
        self.assertEqual(parsed["changes"]["discount_rate"],10)
    def test_cashflows_include_reviewed_source_capex_and_production(self):
        sources={"production":[{"year":i,"ore_tonnes":1000000,"grade_pct":0.8} for i in range(1,12)],
                 "capex":[{"year":0,"category":"plant","amount_usd":30000000}]}
        p={**DEFAULTS,"commodity_price_usd_per_t":9200,"metal_recovery_pct":87,"cost_per_ore_t_usd":55}
        result=calculate(OPTIONS[0],p,source_inputs=sources)
        self.assertEqual(result["annual_flows"][0]["capex"],130)
        self.assertEqual(result["annual_flows"][0]["cash_flow"],-130)

class StrategicApiTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.target=Target.objects.create(id="S-01",name="Sample",commodity="Cu",deposit="Porphyry",
            ai_score=90,confidence=70,completeness=70,priority="High",stage="General",
            action="Study",x=50,y=50,rationale="Study",evidence=[])
        cls.steward=get_user_model().objects.create_user(username="s-steward",password="testpass123")
        cls.cp=get_user_model().objects.create_user(username="s-cp",password="testpass123")
        Group.objects.get_or_create(name="data_steward")[0].user_set.add(cls.steward)
        Group.objects.get_or_create(name="competent_person")[0].user_set.add(cls.cp)
    def test_fleet_comparison_requires_auth_and_is_deterministic(self):
        url="/api/strategic-scenarios/fleet/"
        payload={"prompt":"Compare fleet strategies for mining equipment"}
        self.assertIn(self.client.post(url,payload,format="json").status_code,[401,403])
        self.client.force_authenticate(user=self.steward)
        one=self.client.post(url,payload,format="json")
        self.assertEqual(one.status_code,200)
        self.assertEqual(one.data["calculation_mode"],"deterministic_python_dcf")
        self.assertFalse(one.data["verified_project_economics"])
        self.assertEqual(one.data["results"],self.client.post(url,payload,format="json").data["results"])
        self.assertEqual(self.client.post(url,{**payload,"use_reviewed_sources":True,"target_id":"S-01"},format="json").status_code,409)
    def test_import_and_review_source_evidence(self):
        self.client.force_authenticate(user=self.steward)
        filename="production.csv"
        rows="year,ore_tonnes,grade_pct\n"+''.join(f"{year},1000000,0.8\n" for year in range(1,12))
        url="/api/targets/S-01/financial-sources/"
        response=self.client.post(url,{"source":"minetrust","model_version":"v1",
          "file":SimpleUploadedFile(filename,rows.encode(),content_type="text/csv")},format="multipart")
        self.assertEqual(response.status_code,201,response.data)
        snapshot_id=response.data["id"]
        self.client.force_authenticate(user=self.cp)
        reviewed=self.client.post(url+str(snapshot_id)+"/review/",{"decision":"approve","rationale":"Geological plan reviewed"},format="json")
        self.assertEqual(reviewed.status_code,200,reviewed.data)
        self.assertTrue(FinancialSourceSnapshot.objects.get(id=snapshot_id).reviewed_by_id)
    def test_risk_source_rejects_invalid_and_stress_fails_closed(self):
        self.client.force_authenticate(user=self.steward)
        url="/api/targets/S-01/risk-sources/"
        invalid="period,commodity,price_usd_per_t\n2026Q1,copper,-10\n"
        response=self.client.post(url,{"source":"market","model_version":"v1",
          "file":SimpleUploadedFile("market.csv",invalid.encode(),content_type="text/csv")},format="multipart")
        self.assertEqual(response.status_code,400)
        self.assertEqual(self.client.post("/api/targets/S-01/risk-stress/",{},format="json").status_code,409)

    def test_risk_three_reviewed_sources_enable_repeatable_stress(self):
        self.client.force_authenticate(user=self.steward)
        specs={
            "geotech":"scenario,static_fos,seismic_fos,seepage_index\nbase,1.45,1.22,0.5\n",
            "pitram":"period,downtime_hours,scheduled_hours,mtbf_hours,mttr_hours,haul_efficiency_pct\n2026Q1,50,1000,100,5,85\n",
            "market":"period,commodity,price_usd_per_t\n2026Q1,copper,9000\n2026Q2,copper,9500\n2026Q3,copper,9200\n2026Q4,copper,8800\n"
        }
        for source,text in specs.items():
            res=self.client.post("/api/targets/S-01/risk-sources/",{"source":source,
                "model_version":"scenario-1",
                "file":SimpleUploadedFile(source+".csv",text.encode(),content_type="text/csv")},format="multipart")
            self.assertEqual(res.status_code,201,res.data)
            self.client.force_authenticate(user=self.cp)
            review=self.client.post("/api/targets/S-01/risk-sources/"+str(res.data["id"])+"/review/",
                {"decision":"approve","rationale":"Risk input reviewed and traced"},format="json")
            self.assertEqual(review.status_code,200,review.data)
            self.client.force_authenticate(user=self.steward)
        url="/api/targets/S-01/risk-stress/"
        a=self.client.post(url,{"iterations":200},format="json")
        self.assertEqual(a.status_code,200,a.data)
        b=self.client.post(url,{"iterations":200},format="json")
        self.assertEqual(a.data["distribution"],b.data["distribution"])
        self.assertGreater(a.data["inputs"]["historical_copper_price_usd_per_t"],8000)
