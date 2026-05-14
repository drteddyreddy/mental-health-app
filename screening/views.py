import csv
import io

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .forms import CampaignForm, CompanyForm, CSVUploadForm
from .models import (
    Campaign,
    Company,
    Employee,
    Question,
    ScreeningResponse,
    ScreeningSession,
)
from .utils import calculate_score, get_recommendations, get_severity


def index(request):
    return render(request, "screening/index.html")


@login_required
def company_setup(request):
    company, created = Company.objects.get_or_create(user=request.user)
    if request.method == "POST":
        form = CompanyForm(request.POST, instance=company)
        if form.is_valid():
            form.save()
            messages.success(request, "Company profile updated!")
            return redirect("screening:dashboard")
    else:
        form = CompanyForm(instance=company)
    return render(request, "screening/company_form.html", {"form": form, "is_new": created})


@login_required
def dashboard(request):
    try:
        company = Company.objects.get(user=request.user)
    except Company.DoesNotExist:
        return redirect("screening:company_setup")

    employees = Employee.objects.filter(company=company, is_active=True)
    campaigns = Campaign.objects.filter(company=company)
    sessions = ScreeningSession.objects.filter(
        campaign__company=company, completed_at__isnull=False
    )

    total_employees = employees.count()
    total_campaigns = campaigns.count()
    total_sessions = sessions.count()
    completion_rate = 0
    if total_employees > 0 and total_campaigns > 0:
        expected = total_employees * total_campaigns
        if expected > 0:
            completion_rate = int((total_sessions / expected) * 100)
            if completion_rate > 100:
                completion_rate = 100

    dept_stats = []
    dept_data = employees.values("department").annotate(
        emp_count=Count("id"),
        session_count=Count("sessions", filter=Q(sessions__completed_at__isnull=False)),
    )
    for d in dept_data:
        avg_score = None
        dept_sessions = ScreeningSession.objects.filter(
            employee__company=company,
            employee__department=d["department"],
            completed_at__isnull=False,
        )
        if dept_sessions.exists():
            all_scores = []
            for s in dept_sessions:
                res, _ = calculate_score(s)
                if res:
                    all_scores.append(res.get("overall", 0))
            if all_scores:
                avg_score = round(sum(all_scores) / len(all_scores), 1)
        dept_stats.append(
            {
                "department": d["department"],
                "emp_count": d["emp_count"],
                "session_count": d["session_count"],
                "avg_score": avg_score,
            }
        )

    severity_dist = {"Minimal": 0, "Mild": 0, "Moderate": 0, "Severe": 0}
    for s in sessions:
        res, _ = calculate_score(s)
        if res:
            severities = [v["severity"] for k, v in res.items() if k != "overall"]
            for sev in severities:
                if sev in severity_dist:
                    severity_dist[sev] += 1

    campaign_trends = []
    for c in campaigns:
        c_sessions = ScreeningSession.objects.filter(campaign=c, completed_at__isnull=False)
        if c_sessions.exists():
            scores = []
            for s in c_sessions:
                res, _ = calculate_score(s)
                if res:
                    scores.append(res.get("overall", 0))
            avg = round(sum(scores) / len(scores), 1) if scores else None
        else:
            avg = None
        campaign_trends.append(
            {
                "name": c.name,
                "avg_score": avg,
                "session_count": c_sessions.count(),
                "created_at": c.created_at,
            }
        )

    context = {
        "company": company,
        "total_employees": total_employees,
        "total_campaigns": total_campaigns,
        "total_sessions": total_sessions,
        "completion_rate": completion_rate,
        "dept_stats": dept_stats,
        "severity_dist": severity_dist,
        "campaign_trends": campaign_trends,
    }
    return render(request, "screening/dashboard.html", context)


@login_required
def employee_upload(request):
    try:
        company = Company.objects.get(user=request.user)
    except Company.DoesNotExist:
        return redirect("screening:company_setup")

    if request.method == "POST":
        form = CSVUploadForm(request.POST, request.FILES)
        if form.is_valid():
            csv_file = request.FILES["csv_file"]
            decoded = csv_file.read().decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
            count = 0
            for row in reader:
                name = row.get("name", "").strip()
                department = row.get("department", "").strip()
                designation = row.get("designation", "").strip()
                if name:
                    Employee.objects.create(
                        company=company,
                        name=name,
                        department=department,
                        designation=designation,
                    )
                    count += 1
            messages.success(request, f"{count} employees imported successfully!")
            return redirect("screening:employee_list")
    else:
        form = CSVUploadForm()
    return render(request, "screening/employee_upload.html", {"form": form})


@login_required
def employee_list(request):
    try:
        company = Company.objects.get(user=request.user)
    except Company.DoesNotExist:
        return redirect("screening:company_setup")

    employees = Employee.objects.filter(company=company, is_active=True).order_by(
        "department", "name"
    )
    return render(request, "screening/employee_list.html", {"employees": employees})


@login_required
def campaign_list(request):
    try:
        company = Company.objects.get(user=request.user)
    except Company.DoesNotExist:
        return redirect("screening:company_setup")

    campaigns = Campaign.objects.filter(company=company)
    return render(request, "screening/campaign_list.html", {"campaigns": campaigns})


@login_required
def campaign_create(request):
    try:
        company = Company.objects.get(user=request.user)
    except Company.DoesNotExist:
        return redirect("screening:company_setup")

    if request.method == "POST":
        form = CampaignForm(request.POST)
        if form.is_valid():
            campaign = form.save(commit=False)
            campaign.company = company
            campaign.save()
            form.save_m2m()
            employees = Employee.objects.filter(company=company, is_active=True)
            for emp in employees:
                ScreeningSession.objects.get_or_create(campaign=campaign, employee=emp)
            messages.success(
                request, f'Campaign "{campaign.name}" created! Anonymous links generated.'
            )
            return redirect("screening:campaign_detail", pk=campaign.pk)
    else:
        form = CampaignForm()
    return render(request, "screening/campaign_form.html", {"form": form, "is_new": True})


@login_required
def campaign_detail(request, pk):
    try:
        company = Company.objects.get(user=request.user)
    except Company.DoesNotExist:
        return redirect("screening:company_setup")

    campaign = get_object_or_404(Campaign, pk=pk, company=company)
    sessions = ScreeningSession.objects.filter(campaign=campaign).select_related("employee")

    completed_sessions = sessions.filter(completed_at__isnull=False)
    completion_rate = 0
    if sessions.exists():
        completion_rate = int((completed_sessions.count() / sessions.count()) * 100)

    dept_breakdown = {}
    for s in completed_sessions:
        dept = s.employee.department
        res, _ = calculate_score(s)
        if res:
            if dept not in dept_breakdown:
                dept_breakdown[dept] = {"scores": [], "count": 0}
            dept_breakdown[dept]["scores"].append(res.get("overall", 0))
            dept_breakdown[dept]["count"] += 1

    dept_avg = []
    for dept, data in dept_breakdown.items():
        avg = round(sum(data["scores"]) / len(data["scores"]), 1) if data["scores"] else None
        dept_avg.append({"department": dept, "avg_score": avg, "count": data["count"]})

    context = {
        "campaign": campaign,
        "sessions": sessions,
        "completed_count": completed_sessions.count(),
        "total_count": sessions.count(),
        "completion_rate": completion_rate,
        "dept_avg": dept_avg,
    }
    return render(request, "screening/campaign_detail.html", context)


def screening_view(request, link_id):
    session = get_object_or_404(ScreeningSession, unique_link_id=link_id)

    if session.is_completed():
        return redirect("screening:result", link_id=link_id)

    questionnaires = session.campaign.questionnaires.all()
    questions = Question.objects.filter(questionnaire__in=questionnaires).order_by(
        "questionnaire__order", "order"
    )

    if request.method == "POST":
        for q in questions:
            key = f"q_{q.id}"
            score = request.POST.get(key)
            if score is not None:
                ScreeningResponse.objects.update_or_create(
                    session=session,
                    question=q,
                    defaults={"score": int(score)},
                )
        session.completed_at = timezone.now()
        session.save()
        messages.success(request, "Your responses have been recorded. Thank you!")
        return redirect("screening:result", link_id=link_id)

    context = {
        "session": session,
        "questionnaires": questionnaires,
        "questions": questions,
        "employee_code": session.employee.code_short(),
    }
    return render(request, "screening/screening_form.html", context)


def result_view(request, link_id):
    session = get_object_or_404(ScreeningSession, unique_link_id=link_id)
    if not session.is_completed():
        return redirect("screening:screening", link_id=link_id)

    res, q_data = calculate_score(session)
    company = session.campaign.company
    is_pro = company.tier == "pro"

    questionnaire_results = []
    all_recommendations = {}
    if res:
        for q_name in q_data:
            q_res = res.get(q_name, {})
            sev = q_res.get("severity", "Minimal")
            questionnaire_results.append(
                {
                    "name": q_name,
                    "score": q_res.get("score", 0),
                    "max": q_res.get("max", 0),
                    "severity": sev,
                }
            )
            recs = get_recommendations(q_name, sev) if is_pro else []
            all_recommendations[q_name] = recs

    context = {
        "session": session,
        "questionnaire_results": questionnaire_results,
        "overall_score": res.get("overall", 0) if res else 0,
        "is_pro": is_pro,
        "recommendations": all_recommendations,
        "employee_code": session.employee.code_short(),
    }
    return render(request, "screening/result.html", context)


@login_required
def employee_results(request):
    try:
        company = Company.objects.get(user=request.user)
    except Company.DoesNotExist:
        return redirect("screening:company_setup")

    code_search = request.GET.get("code", "").strip()
    employee = None
    sessions = None
    if code_search:
        try:
            employee = Employee.objects.get(
                company=company, anonymous_code=code_search, is_active=True
            )
        except (Employee.DoesNotExist, ValueError):
            employees = Employee.objects.filter(company=company, is_active=True)
            match = None
            for emp in employees:
                if emp.code_short() == code_search.upper():
                    match = emp
                    break
            if match:
                employee = match
            else:
                msg = "Could not find an employee with that code."
                return render(request, "screening/employee_results.html", {"error": msg})
        sessions = ScreeningSession.objects.filter(employee=employee).order_by(
            "-campaign__created_at"
        )

    context = {
        "employee": employee,
        "sessions": sessions,
    }
    return render(request, "screening/employee_results.html", context)


@login_required
def pdf_report(request, campaign_id):
    try:
        company = Company.objects.get(user=request.user)
    except Company.DoesNotExist:
        return redirect("screening:company_setup")

    campaign = get_object_or_404(Campaign, pk=campaign_id, company=company)
    sessions = ScreeningSession.objects.filter(campaign=campaign, completed_at__isnull=False)

    response = HttpResponse(content_type="application/pdf")
    response["Content-Disposition"] = (
        f'attachment; filename="report_{campaign.name.replace(" ", "_")}.pdf"'
    )

    doc = SimpleDocTemplate(response, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(f"{company.name} - Mental Health Screening Report", styles["Title"]))
    elements.append(Paragraph(f"Campaign: {campaign.name}", styles["Heading2"]))
    elements.append(Spacer(1, 12))

    total_employees = Employee.objects.filter(company=company, is_active=True).count()
    completion_rate = int((sessions.count() / total_employees) * 100) if total_employees > 0 else 0
    elements.append(
        Paragraph(
            f"Completion Rate: {completion_rate}% ({sessions.count()}/{total_employees})",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 12))

    data = [["Department", "Avg Score", "Severity", "Responses"]]
    dept_data = {}
    for s in sessions:
        dept = s.employee.department
        res, _ = calculate_score(s)
        if res:
            if dept not in dept_data:
                dept_data[dept] = {"scores": [], "total_sessions": 0}
            dept_data[dept]["scores"].append(res.get("overall", 0))
            dept_data[dept]["total_sessions"] += 1

    for dept, info in dept_data.items():
        avg = sum(info["scores"]) / len(info["scores"])
        sev = get_severity("PHQ-9", avg)
        data.append([dept, f"{avg:.1f}", sev, str(info["total_sessions"])])

    if len(data) > 1:
        table = Table(data, colWidths=[150, 100, 100, 100])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.2, 0.4, 0.6)),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ("GRID", (0, 0), (-1, -1), 1, colors.Color(0.8, 0.8, 0.8)),
                    (
                        "ROWBACKGROUNDS",
                        (0, 1),
                        (-1, -1),
                        [colors.Color(0.95, 0.95, 0.95), colors.white],
                    ),
                ]
            )
        )
        elements.append(table)
    else:
        elements.append(Paragraph("No data available for this campaign.", styles["Normal"]))

    elements.append(Spacer(1, 24))
    elements.append(
        Paragraph(
            "Severity Scale: 0-4 Minimal | 5-9 Mild | 10-14 Moderate | 15+ Severe", styles["Normal"]
        )
    )
    elements.append(
        Paragraph(
            "This report contains aggregate data only. "
            "No individual employee results are disclosed.",
            styles["Normal"],
        )
    )

    doc.build(elements)
    return response
