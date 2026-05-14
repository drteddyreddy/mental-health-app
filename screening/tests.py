import csv
import io
import uuid

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client, TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import (
    Campaign,
    Company,
    Employee,
    GradingConfig,
    Question,
    Questionnaire,
    ScreeningResponse,
    ScreeningSession,
    UserProfile,
)
from .utils import calculate_score, get_recommendations, get_severity


class ModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="hr", password="pass1234")
        self.company = Company.objects.create(user=self.user, name="TestCorp")
        self.employee = Employee.objects.create(
            company=self.company, name="Alice", department="Eng", designation="Dev"
        )
        self.qnr = Questionnaire.objects.create(name="PHQ-9", max_score=27)
        self.q1 = Question.objects.create(questionnaire=self.qnr, text="Q1", order=1, max_score=3)
        self.q2 = Question.objects.create(questionnaire=self.qnr, text="Q2", order=2, max_score=3)
        self.campaign = Campaign.objects.create(
            company=self.company, name="Q1", start_date="2026-01-01", end_date="2026-03-31"
        )
        self.campaign.questionnaires.add(self.qnr)
        self.session = ScreeningSession.objects.create(
            campaign=self.campaign, employee=self.employee
        )

    def test_company_str(self):
        self.assertEqual(str(self.company), "TestCorp")

    def test_employee_str(self):
        self.assertIn("Alice", str(self.employee))
        self.assertIn(str(self.employee.anonymous_code)[:8].upper(), str(self.employee))

    def test_employee_code_short(self):
        self.assertEqual(len(self.employee.code_short()), 8)

    def test_campaign_str(self):
        self.assertIn("TestCorp", str(self.campaign))
        self.assertIn("Q1", str(self.campaign))

    def test_questionnaire_str(self):
        self.assertEqual(str(self.qnr), "PHQ-9")

    def test_question_ordering(self):
        qs = Question.objects.filter(questionnaire=self.qnr)
        self.assertEqual(list(qs), [self.q1, self.q2])

    def test_session_is_completed(self):
        self.assertFalse(self.session.is_completed())
        self.session.completed_at = timezone.now()
        self.session.save()
        self.assertTrue(self.session.is_completed())

    def test_session_unique_constraint(self):
        with self.assertRaises(Exception):
            ScreeningSession.objects.create(campaign=self.campaign, employee=self.employee)

    def test_grading_config_str(self):
        cfg = GradingConfig.objects.create(
            company=self.company, rules={"grade_boundaries": {"A": 10}}
        )
        self.assertIn("TestCorp", str(cfg))

    def test_user_profile_str(self):
        profile = UserProfile.objects.create(user=self.user, role="hr")
        self.assertIn("hr", str(profile))


class UtilTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="hr", password="pass")
        self.company = Company.objects.create(user=self.user, name="C")
        self.employee = Employee.objects.create(company=self.company, name="E", department="D")
        self.qnr = Questionnaire.objects.create(name="PHQ-9", max_score=27)
        self.q1 = Question.objects.create(questionnaire=self.qnr, text="Q1", order=1, max_score=3)
        self.q2 = Question.objects.create(questionnaire=self.qnr, text="Q2", order=2, max_score=3)
        self.campaign = Campaign.objects.create(
            company=self.company, name="C1", start_date="2026-01-01", end_date="2026-03-31"
        )
        self.campaign.questionnaires.add(self.qnr)
        self.session = ScreeningSession.objects.create(
            campaign=self.campaign, employee=self.employee
        )

    def test_calculate_score_empty(self):
        res, _ = calculate_score(self.session)
        self.assertIsNone(res)

    def test_calculate_score_partial(self):
        ScreeningResponse.objects.create(session=self.session, question=self.q1, score=2)
        res, q_data = calculate_score(self.session)
        self.assertIsNotNone(res)
        self.assertIn("PHQ-9", res)
        self.assertIn("overall", res)

    def test_calculate_score_full(self):
        ScreeningResponse.objects.create(session=self.session, question=self.q1, score=2)
        ScreeningResponse.objects.create(session=self.session, question=self.q2, score=1)
        res, _ = calculate_score(self.session)
        self.assertEqual(res["PHQ-9"]["score"], 3)
        self.assertEqual(res["overall"], 3)

    def test_get_severity_phq9(self):
        self.assertEqual(get_severity("PHQ-9", 3), "Minimal")
        self.assertEqual(get_severity("PHQ-9", 7), "Mild")
        self.assertEqual(get_severity("PHQ-9", 12), "Moderate")
        self.assertEqual(get_severity("PHQ-9", 18), "Severe")

    def test_get_severity_who5(self):
        self.assertEqual(get_severity("WHO-5", 10), "Poor")
        self.assertEqual(get_severity("WHO-5", 15), "Fair")
        self.assertEqual(get_severity("WHO-5", 20), "Good")
        self.assertEqual(get_severity("WHO-5", 24), "Excellent")

    def test_get_severity_wpai(self):
        self.assertEqual(get_severity("WPAI", 10), "Minimal")
        self.assertEqual(get_severity("WPAI", 30), "Mild")
        self.assertEqual(get_severity("WPAI", 50), "Moderate")
        self.assertEqual(get_severity("WPAI", 80), "Severe")

    def test_get_recommendations_phq9_severe(self):
        recs = get_recommendations("PHQ-9", "Severe")
        self.assertTrue(len(recs) > 0)
        self.assertTrue(any("severe" in r.lower() for r in recs))

    def test_get_recommendations_unknown(self):
        recs = get_recommendations("UNKNOWN", "Mild")
        self.assertEqual(recs, [])

    def test_reverse_scoring(self):
        qnr = Questionnaire.objects.create(
            name="CBI-W", max_score=28, metadata={"reverse_items": [0]}
        )
        q = Question.objects.create(questionnaire=qnr, text="Q", order=1, max_score=4)
        campaign = Campaign.objects.create(
            company=self.company, name="C2", start_date="2026-01-01", end_date="2026-03-31"
        )
        campaign.questionnaires.add(qnr)
        session = ScreeningSession.objects.create(campaign=campaign, employee=self.employee)
        ScreeningResponse.objects.create(session=session, question=q, score=1)
        res, _ = calculate_score(session)
        self.assertEqual(res["CBI-W"]["score"], 3)


class APITests(APITestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username="hr", password="pass1234")
        self.company = Company.objects.create(user=self.user, name="TestCorp", tier="pro")
        UserProfile.objects.create(user=self.user, role="hr")
        self.employee = Employee.objects.create(
            company=self.company, name="Bob", department="Sales"
        )
        self.qnr = Questionnaire.objects.create(name="GAD-7", max_score=21)
        self.q1 = Question.objects.create(questionnaire=self.qnr, text="GQ1", order=1, max_score=3)
        self.q2 = Question.objects.create(questionnaire=self.qnr, text="GQ2", order=2, max_score=3)
        self.campaign = Campaign.objects.create(
            company=self.company, name="Q1", start_date="2026-01-01", end_date="2026-03-31"
        )
        self.campaign.questionnaires.add(self.qnr)
        self.session = ScreeningSession.objects.create(
            campaign=self.campaign, employee=self.employee
        )

    def _auth(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "hr", "password": "pass1234"},
            content_type="application/json",
        )
        token = resp.json()["access"]
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"

    def test_register(self):
        data = {
            "username": "newhr",
            "email": "hr@test.com",
            "password": "testpass123",
            "company_name": "NewCo",
        }
        resp = self.client.post("/api/auth/register/", data, content_type="application/json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", resp.json())

    def test_login(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "hr", "password": "pass1234"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.json())

    def test_auth_me(self):
        self._auth()
        resp = self.client.get("/api/auth/me/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["role"], "hr")

    def test_company_retrieve(self):
        self._auth()
        resp = self.client.get("/api/company/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["name"], "TestCorp")

    def test_employee_list(self):
        self._auth()
        resp = self.client.get("/api/employees/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json().get("results", resp.json())
        self.assertEqual(len(results), 1)

    def test_employee_create(self):
        self._auth()
        resp = self.client.post(
            "/api/employees/",
            {"name": "Charlie", "department": "IT", "designation": "Eng"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Employee.objects.filter(company=self.company).count(), 2)

    def test_campaign_list(self):
        self._auth()
        resp = self.client.get("/api/campaigns/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.json().get("results", resp.json())
        self.assertEqual(len(results), 1)

    def test_campaign_create(self):
        self._auth()
        resp = self.client.post(
            "/api/campaigns/",
            {
                "name": "Q2",
                "start_date": "2026-04-01",
                "end_date": "2026-06-30",
                "questionnaire_ids": [self.qnr.id],
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Campaign.objects.filter(company=self.company).count(), 2)

    def test_campaign_sessions(self):
        self._auth()
        resp = self.client.get(f"/api/campaigns/{self.campaign.id}/sessions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["total"], 1)

    def test_screening_get(self):
        resp = self.client.get(f"/api/screening/{self.session.unique_link_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("questionnaires", resp.json())
        self.assertEqual(len(resp.json()["questionnaires"]), 1)

    def test_screening_submit(self):
        resp = self.client.post(
            f"/api/screening/{self.session.unique_link_id}/",
            {
                "responses": [
                    {"question": self.q1.id, "score": 2},
                    {"question": self.q2.id, "score": 1},
                ]
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.session.refresh_from_db()
        self.assertTrue(self.session.is_completed())

    def test_screening_already_completed(self):
        self.session.completed_at = timezone.now()
        self.session.save()
        resp = self.client.get(f"/api/screening/{self.session.unique_link_id}/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_results_view(self):
        ScreeningResponse.objects.create(session=self.session, question=self.q1, score=2)
        ScreeningResponse.objects.create(session=self.session, question=self.q2, score=1)
        self.session.completed_at = timezone.now()
        self.session.save()
        resp = self.client.get(f"/api/results/{self.session.unique_link_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("results", resp.json())

    def test_dashboard_stats(self):
        self._auth()
        resp = self.client.get("/api/dashboard/stats/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("total_employees", resp.json())

    def test_employee_lookup(self):
        self._auth()
        resp = self.client.get(f"/api/employees/lookup/?code={self.employee.anonymous_code}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["employee"]["name"], "Bob")

    def test_employee_lookup_short_code(self):
        self._auth()
        resp = self.client.get(f"/api/employees/lookup/?code={self.employee.code_short()}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_unauthenticated_access(self):
        resp = self.client.get("/api/company/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_questionnaire_list(self):
        self._auth()
        resp = self.client.get("/api/questionnaires/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_employee_upload_csv(self):
        self._auth()
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["name", "department", "designation"])
        w.writerow(["Dave", "Finance", "Analyst"])
        w.writerow(["Eve", "Finance", "Manager"])
        file = SimpleUploadedFile(
            "employees.csv", buf.getvalue().encode("utf-8-sig"), content_type="text/csv"
        )
        resp = self.client.post("/api/employees/upload/", {"file": file}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["imported"], 2)


class AuthEdgeCaseTests(APITestCase):
    def test_register_missing_fields(self):
        resp = self.client.post(
            "/api/auth/register/", {"username": "nopass"}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("required", resp.json().get("error", ""))

    def test_register_duplicate_username(self):
        User.objects.create_user(username="taken", password="pass1234")
        data = {
            "username": "taken",
            "email": "a@b.com",
            "password": "pass1234",
            "company_name": "C",
        }
        resp = self.client.post("/api/auth/register/", data, content_type="application/json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", resp.json().get("error", ""))

    def test_register_duplicate_email(self):
        User.objects.create_user(username="u1", email="dup@b.com", password="pass1234")
        data = {"username": "u2", "email": "dup@b.com", "password": "pass1234", "company_name": "C"}
        resp = self.client.post("/api/auth/register/", data, content_type="application/json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", resp.json().get("error", ""))

    def test_login_wrong_password(self):
        User.objects.create_user(username="u", password="correct")
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "u", "password": "wrong"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_invalid(self):
        resp = self.client.post(
            "/api/auth/token/refresh/", {"refresh": "invalid"}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_wrong_old(self):
        user = User.objects.create_user(username="u", password="old1234")
        Company.objects.create(user=user, name="C")
        UserProfile.objects.create(user=user, role="hr")
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "u", "password": "old1234"},
            content_type="application/json",
        )
        token = resp.json()["access"]
        resp = self.client.post(
            "/api/auth/change-password/",
            {"old_password": "wrong", "new_password": "new12345678"},
            content_type="application/json",
            HTTP_AUTHORIZATION=f"Bearer {token}",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("incorrect", resp.json().get("error", ""))

    def test_change_password_unauthenticated(self):
        resp = self.client.post(
            "/api/auth/change-password/",
            {"old_password": "x", "new_password": "y"},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class ScreeningEdgeCaseTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="hr", password="pass1234")
        self.company = Company.objects.create(user=self.user, name="C")
        UserProfile.objects.create(user=self.user, role="hr")
        self.qnr = Questionnaire.objects.create(name="PHQ-9", max_score=27)
        self.q1 = Question.objects.create(questionnaire=self.qnr, text="Q1", order=1, max_score=3)
        self.employee = Employee.objects.create(company=self.company, name="E", department="D")
        self.campaign = Campaign.objects.create(
            company=self.company, name="C1", start_date="2026-01-01", end_date="2026-03-31"
        )
        self.campaign.questionnaires.add(self.qnr)
        self.session = ScreeningSession.objects.create(
            campaign=self.campaign, employee=self.employee
        )

    def test_screening_get_invalid_link(self):
        resp = self.client.get(f"/api/screening/{uuid.uuid4()}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_screening_post_invalid_link(self):
        resp = self.client.post(
            f"/api/screening/{uuid.uuid4()}/", {"responses": []}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_screening_submit_empty_responses(self):
        resp = self.client.post(
            f"/api/screening/{self.session.unique_link_id}/",
            {"responses": []},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_screening_submit_no_responses_key(self):
        resp = self.client.post(
            f"/api/screening/{self.session.unique_link_id}/", {}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_screening_submit_partial_updates_session(self):
        resp = self.client.post(
            f"/api/screening/{self.session.unique_link_id}/",
            {
                "responses": [{"question": self.q1.id, "score": 2}],
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.session.refresh_from_db()
        self.assertTrue(self.session.is_completed())
        self.assertEqual(ScreeningResponse.objects.count(), 1)

    def test_screening_post_already_completed(self):
        self.session.completed_at = timezone.now()
        self.session.save()
        resp = self.client.post(
            f"/api/screening/{self.session.unique_link_id}/",
            {
                "responses": [{"question": self.q1.id, "score": 2}],
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_results_not_yet_completed(self):
        resp = self.client.get(f"/api/results/{self.session.unique_link_id}/")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_results_invalid_link(self):
        resp = self.client.get(f"/api/results/{uuid.uuid4()}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_results_basic_tier_no_recommendations(self):
        self.company.tier = "basic"
        self.company.save()
        ScreeningResponse.objects.create(session=self.session, question=self.q1, score=1)
        self.session.completed_at = timezone.now()
        self.session.save()
        resp = self.client.get(f"/api/results/{self.session.unique_link_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for r in resp.json()["results"]:
            self.assertEqual(r["recommendations"], [])

    def test_results_pro_tier_has_recommendations(self):
        self.company.tier = "pro"
        self.company.save()
        ScreeningResponse.objects.create(session=self.session, question=self.q1, score=3)
        self.session.completed_at = timezone.now()
        self.session.save()
        resp = self.client.get(f"/api/results/{self.session.unique_link_id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for r in resp.json()["results"]:
            if r["severity"] in ("Moderate", "Severe"):
                self.assertTrue(len(r["recommendations"]) > 0)


class EmployeeEdgeCaseTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="hr", password="pass1234")
        self.company = Company.objects.create(user=self.user, name="C")
        UserProfile.objects.create(user=self.user, role="hr")
        self.employee = Employee.objects.create(
            company=self.company, name="Bob", department="Sales"
        )

    def _auth(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "hr", "password": "pass1234"},
            content_type="application/json",
        )
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {resp.json()['access']}"

    def test_lookup_empty_code(self):
        self._auth()
        resp = self.client.get("/api/employees/lookup/?code=")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_lookup_nonexistent_code(self):
        self._auth()
        resp = self.client.get("/api/employees/lookup/?code=NONEXIST")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_lookup_inactive_employee(self):
        self._auth()
        self.employee.is_active = False
        self.employee.save()
        resp = self.client.get(f"/api/employees/lookup/?code={self.employee.code_short()}")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_upload_no_file(self):
        self._auth()
        resp = self.client.post("/api/employees/upload/", {}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_non_csv(self):
        self._auth()
        file = SimpleUploadedFile("data.txt", b"name,department\na,b", content_type="text/plain")
        resp = self.client.post("/api/employees/upload/", {"file": file}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_upload_malformed_csv(self):
        self._auth()
        file = SimpleUploadedFile("employees.csv", b"not,a,csv,format", content_type="text/csv")
        resp = self.client.post("/api/employees/upload/", {"file": file}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["imported"], 0)

    def test_employee_list_excludes_inactive(self):
        self._auth()
        Employee.objects.create(
            company=self.company, name="Charlie", department="IT", is_active=False
        )
        resp = self.client.get("/api/employees/")
        results = resp.json().get("results", resp.json())
        names = [e["name"] for e in results]
        self.assertIn("Bob", names)
        self.assertNotIn("Charlie", names)

    def test_employee_list_includes_inactive_when_requested(self):
        self._auth()
        Employee.objects.create(
            company=self.company, name="Charlie", department="IT", is_active=False
        )
        resp = self.client.get("/api/employees/?include_inactive=true")
        results = resp.json().get("results", resp.json())
        names = [e["name"] for e in results]
        self.assertIn("Bob", names)
        self.assertIn("Charlie", names)


class CampaignEdgeCaseTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="hr", password="pass1234")
        self.company = Company.objects.create(user=self.user, name="C")
        UserProfile.objects.create(user=self.user, role="hr")
        self.qnr = Questionnaire.objects.create(name="PHQ-9", max_score=27)
        self.employee = Employee.objects.create(company=self.company, name="E", department="D")

    def _auth(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "hr", "password": "pass1234"},
            content_type="application/json",
        )
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {resp.json()['access']}"

    def test_campaign_create_without_questionnaire_ids(self):
        self._auth()
        resp = self.client.post(
            "/api/campaigns/",
            {
                "name": "NoQs",
                "start_date": "2026-01-01",
                "end_date": "2026-03-31",
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_campaign_sessions_zero_completion_rate(self):
        self._auth()
        campaign = Campaign.objects.create(
            company=self.company, name="Empty", start_date="2026-01-01", end_date="2026-03-31"
        )
        campaign.questionnaires.add(self.qnr)
        resp = self.client.get(f"/api/campaigns/{campaign.id}/sessions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["completion_rate"], 0)

    def test_campaign_access_other_company_returns_404(self):
        self._auth()
        other_user = User.objects.create_user(username="other", password="pass1234")
        other_company = Company.objects.create(user=other_user, name="Other")
        other_campaign = Campaign.objects.create(
            company=other_company, name="OtherC", start_date="2026-01-01", end_date="2026-03-31"
        )
        resp = self.client.get(f"/api/campaigns/{other_campaign.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_campaign_create_creates_sessions_for_active_employees(self):
        self._auth()
        Employee.objects.create(
            company=self.company, name="ActiveEmp", department="D", is_active=True
        )
        Employee.objects.create(
            company=self.company, name="InactiveEmp", department="D", is_active=False
        )
        resp = self.client.post(
            "/api/campaigns/",
            {
                "name": "WithSessions",
                "start_date": "2026-01-01",
                "end_date": "2026-03-31",
                "questionnaire_ids": [self.qnr.id],
            },
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        campaign = Campaign.objects.get(name="WithSessions")
        self.assertEqual(campaign.sessions.count(), 1)


class PsychiatristEdgeCaseTests(APITestCase):
    def setUp(self):
        self.hr_user = User.objects.create_user(username="hr", password="pass1234")
        self.hr_company = Company.objects.create(user=self.hr_user, name="HRCorp")
        UserProfile.objects.create(user=self.hr_user, role="hr")
        self.psy_user = User.objects.create_user(username="psy", password="pass1234")
        UserProfile.objects.create(user=self.psy_user, role="psychiatrist")

    def _auth_hr(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "hr", "password": "pass1234"},
            content_type="application/json",
        )
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {resp.json()['access']}"

    def _auth_psy(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "psy", "password": "pass1234"},
            content_type="application/json",
        )
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {resp.json()['access']}"

    def test_hr_cannot_access_psy_dashboard(self):
        self._auth_hr()
        resp = self.client.get("/api/psy/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_psy_can_access_psy_dashboard(self):
        self._auth_psy()
        resp = self.client.get("/api/psy/dashboard/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_psy_can_access_company_detail(self):
        self._auth_psy()
        resp = self.client.get(f"/api/psy/companies/{self.hr_company.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["name"], "HRCorp")

    def test_psy_can_update_company_questionnaires(self):
        self._auth_psy()
        qnr = Questionnaire.objects.create(name="GAD-7", max_score=21)
        resp = self.client.put(
            f"/api/psy/companies/{self.hr_company.id}/",
            {"assigned_questionnaire_ids": [qnr.id]},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.hr_company.refresh_from_db()
        self.assertIn(qnr, self.hr_company.assigned_questionnaires.all())

    def test_psy_grading_config_get_creates_default(self):
        self._auth_psy()
        resp = self.client.get(f"/api/psy/companies/{self.hr_company.id}/grading/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("rules", resp.json())

    def test_psy_grading_config_put(self):
        self._auth_psy()
        resp = self.client.put(
            f"/api/psy/companies/{self.hr_company.id}/grading/",
            {"rules": {"grade_boundaries": {"A": 5, "B": 10, "C": 15, "D": 20, "F": 999}}},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        cfg = GradingConfig.objects.get(company=self.hr_company)
        self.assertEqual(cfg.rules["grade_boundaries"]["A"], 5)

    def test_psy_analytics_empty_company(self):
        self._auth_psy()
        resp = self.client.get(f"/api/psy/companies/{self.hr_company.id}/analytics/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.json()["total_sessions"], 0)

    def test_psy_questionnaires_list(self):
        self._auth_psy()
        Questionnaire.objects.create(name="PHQ-9", max_score=27)
        resp = self.client.get("/api/psy/questionnaires/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(resp.json()) > 0)


class ReportEdgeCaseTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="hr", password="pass1234")
        self.company = Company.objects.create(user=self.user, name="C")
        UserProfile.objects.create(user=self.user, role="hr")
        self.qnr = Questionnaire.objects.create(name="PHQ-9", max_score=27)
        self.q1 = Question.objects.create(questionnaire=self.qnr, text="Q1", order=1, max_score=3)
        self.employee = Employee.objects.create(company=self.company, name="E", department="D")
        self.campaign = Campaign.objects.create(
            company=self.company, name="C1", start_date="2026-01-01", end_date="2026-03-31"
        )
        self.campaign.questionnaires.add(self.qnr)

    def _auth(self):
        resp = self.client.post(
            "/api/auth/login/",
            {"username": "hr", "password": "pass1234"},
            content_type="application/json",
        )
        self.client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {resp.json()['access']}"

    def test_pdf_report_no_sessions(self):
        self._auth()
        resp = self.client.get(f"/api/campaigns/{self.campaign.id}/report.pdf/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp["Content-Type"], "application/pdf")

    def test_csv_report_no_sessions(self):
        self._auth()
        resp = self.client.get(f"/api/campaigns/{self.campaign.id}/report.csv/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp["Content-Type"], "text/csv")

    def test_csv_report_with_sessions(self):
        self._auth()
        session = ScreeningSession.objects.create(campaign=self.campaign, employee=self.employee)
        ScreeningResponse.objects.create(session=session, question=self.q1, score=2)
        session.completed_at = timezone.now()
        session.save()
        resp = self.client.get(f"/api/campaigns/{self.campaign.id}/report.csv/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        content = resp.content.decode("utf-8-sig")
        self.assertIn("Code", content)
        self.assertIn(self.employee.code_short(), content)

    def test_pdf_report_other_company_returns_404(self):
        self._auth()
        other_user = User.objects.create_user(username="other", password="pass1234")
        other_company = Company.objects.create(user=other_user, name="Other")
        other_campaign = Campaign.objects.create(
            company=other_company, name="OtherC", start_date="2026-01-01", end_date="2026-03-31"
        )
        resp = self.client.get(f"/api/campaigns/{other_campaign.id}/report.pdf/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
