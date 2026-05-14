import csv, io
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db.models import Count, Q
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from rest_framework import status, viewsets, generics, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response

from screening.models import (
    Company, Employee, Campaign, Questionnaire,
    Question, ScreeningSession, ScreeningResponse, UserProfile,
)
from screening.utils import calculate_score, get_severity, get_recommendations
from .serializers import (
    CompanySerializer, EmployeeSerializer,
    CampaignListSerializer, CampaignDetailSerializer,
    CampaignCreateSerializer, ScreeningSessionSerializer,
    QuestionSerializer, QuestionnaireSerializer,
    ResultSerializer, DashboardStatsSerializer, UserProfileSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.none()
    permission_classes = [permissions.AllowAny]

    def create(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        company_name = request.data.get('company_name')
        tier = request.data.get('tier', 'basic')

        if not all([username, email, password, company_name]):
            return Response(
                {'error': 'username, email, password, and company_name are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, email=email, password=password)
        Company.objects.create(user=user, name=company_name, tier=tier)
        UserProfile.objects.create(user=user, role='hr')

        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {'id': user.id, 'username': user.username, 'email': user.email, 'role': 'hr'},
        }, status=status.HTTP_201_CREATED)


class CompanyView(generics.RetrieveUpdateAPIView):
    serializer_class = CompanySerializer

    def get_object(self):
        return Company.objects.get(user=self.request.user)


class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        company = Company.objects.get(user=self.request.user)
        qs = Employee.objects.filter(company=company)
        if self.request.query_params.get('include_inactive') != 'true':
            qs = qs.filter(is_active=True)
        return qs

    def perform_create(self, serializer):
        company = Company.objects.get(user=self.request.user)
        serializer.save(company=company)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        company = Company.objects.get(user=request.user)
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        if not file.name.endswith('.csv'):
            return Response({'error': 'File must be CSV'}, status=status.HTTP_400_BAD_REQUEST)

        decoded = file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(decoded))
        count = 0
        errors = []
        for i, row in enumerate(reader, 1):
            name = row.get('name', '').strip()
            department = row.get('department', '').strip()
            designation = row.get('designation', '').strip()
            if not name:
                errors.append(f'Row {i}: missing name')
                continue
            Employee.objects.create(
                company=company, name=name,
                department=department, designation=designation,
            )
            count += 1
        return Response({
            'imported': count,
            'errors': errors,
        })


class CampaignViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        if self.action == 'list':
            return CampaignListSerializer
        if self.action == 'create':
            return CampaignCreateSerializer
        return CampaignDetailSerializer

    def get_queryset(self):
        company = Company.objects.get(user=self.request.user)
        return Campaign.objects.filter(company=company)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if self.action == 'create':
            try:
                ctx['company'] = Company.objects.get(user=self.request.user)
            except Company.DoesNotExist:
                pass
        return ctx

    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        campaign = self.get_object()
        sessions = ScreeningSession.objects.filter(campaign=campaign).select_related('employee')
        serializer = ScreeningSessionSerializer(sessions, many=True, context={'request': request})
        completed = sessions.filter(completed_at__isnull=False).count()
        total = sessions.count()
        return Response({
            'total': total,
            'completed': completed,
            'completion_rate': int((completed / total) * 100) if total > 0 else 0,
            'sessions': serializer.data,
        })


class ScreeningSessionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ScreeningSessionSerializer

    def get_queryset(self):
        company = Company.objects.get(user=self.request.user)
        return ScreeningSession.objects.filter(campaign__company=company).select_related('employee')


@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def screening_view(request, link_id):
    session = get_object_or_404(ScreeningSession, unique_link_id=link_id)

    if request.method == 'GET':
        if session.is_completed():
            return Response({'detail': 'Session already completed'}, status=status.HTTP_400_BAD_REQUEST)

        questionnaires = session.campaign.questionnaires.all()
        questions = Question.objects.filter(
            questionnaire__in=questionnaires
        ).order_by('questionnaire_id', 'order')

        data = {
            'campaign': session.campaign.name,
            'employee_code': session.employee.code_short(),
            'questionnaires': [],
        }
        for q in questionnaires:
            qs = questions.filter(questionnaire=q)
            data['questionnaires'].append({
                'name': q.name,
                'description': q.description,
                'questions': QuestionSerializer(qs, many=True).data,
            })
        return Response(data)

    if request.method == 'POST':
        if session.is_completed():
            return Response({'detail': 'Session already completed'}, status=status.HTTP_400_BAD_REQUEST)

        responses_data = request.data.get('responses', [])
        if not responses_data:
            return Response({'error': 'responses required'}, status=status.HTTP_400_BAD_REQUEST)

        for item in responses_data:
            q_id = item.get('question')
            score = item.get('score')
            if q_id is None or score is None:
                continue
            ScreeningResponse.objects.update_or_create(
                session=session,
                question_id=q_id,
                defaults={'score': int(score)},
            )

        session.completed_at = timezone.now()
        session.save()
        return Response({'detail': 'Screening submitted successfully'})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def result_view(request, link_id):
    session = get_object_or_404(ScreeningSession, unique_link_id=link_id)
    if not session.is_completed():
        return Response({'detail': 'Session not yet completed'}, status=status.HTTP_400_BAD_REQUEST)

    is_pro = session.campaign.company.tier == 'pro'
    res, q_data = calculate_score(session)

    if not res:
        return Response({'detail': 'No results found'}, status=status.HTTP_404_NOT_FOUND)

    results = []
    for q_name in q_data:
        q_res = res.get(q_name, {})
        sev = q_res.get('severity', 'Minimal')
        results.append({
            'questionnaire_name': q_name,
            'score': q_res.get('score', 0),
            'max_score': q_res.get('max', 0),
            'severity': sev,
            'recommendations': get_recommendations(q_name, sev) if is_pro else [],
        })

    return Response({
        'campaign': session.campaign.name,
        'employee_code': session.employee.code_short(),
        'completed_at': session.completed_at,
        'is_pro': is_pro,
        'results': results,
        'overall_score': res.get('overall', 0),
    })


@api_view(['GET'])
def dashboard_stats(request):
    company = get_object_or_404(Company, user=request.user)

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
    for d in employees.values('department').annotate(
        emp_count=Count('id'),
        session_count=Count('sessions', filter=Q(sessions__completed_at__isnull=False)),
    ):
        avg_score = None
        dept_sessions = ScreeningSession.objects.filter(
            employee__company=company,
            employee__department=d['department'],
            completed_at__isnull=False
        )
        if dept_sessions.exists():
            all_scores = []
            for s in dept_sessions:
                res, _ = calculate_score(s)
                if res:
                    all_scores.append(res.get('overall', 0))
            if all_scores:
                avg_score = round(sum(all_scores) / len(all_scores), 1)
        dept_stats.append({
            'department': d['department'],
            'emp_count': d['emp_count'],
            'session_count': d['session_count'],
            'avg_score': avg_score,
        })

    severity_dist = {'Minimal': 0, 'Mild': 0, 'Moderate': 0, 'Severe': 0}
    for s in sessions:
        res, _ = calculate_score(s)
        if res:
            for k, v in res.items():
                if k != 'overall' and v.get('severity') in severity_dist:
                    severity_dist[v['severity']] += 1

    trends = []
    for c in campaigns:
        c_sessions = ScreeningSession.objects.filter(campaign=c, completed_at__isnull=False)
        scores = []
        for s in c_sessions:
            res, _ = calculate_score(s)
            if res:
                scores.append(res.get('overall', 0))
        avg = round(sum(scores) / len(scores), 1) if scores else None
        trends.append({
            'name': c.name,
            'avg_score': avg,
            'session_count': c_sessions.count(),
            'created_at': c.created_at,
        })

    data = {
        'total_employees': total_employees,
        'total_campaigns': total_campaigns,
        'total_sessions': total_sessions,
        'completion_rate': completion_rate,
        'department_breakdown': dept_stats,
        'severity_distribution': severity_dist,
        'campaign_trends': trends,
    }
    serializer = DashboardStatsSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.data)


@api_view(['GET'])
def pdf_report(request, campaign_id):
    company = get_object_or_404(Company, user=request.user)
    campaign = get_object_or_404(Campaign, pk=campaign_id, company=company)
    sessions = ScreeningSession.objects.filter(campaign=campaign, completed_at__isnull=False)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = (
        f'attachment; filename="report_{campaign.name.replace(" ", "_")}.pdf"'
    )

    doc = SimpleDocTemplate(response, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph(
        f'{company.name} — Mental Health Screening Report', styles['Title']
    ))
    elements.append(Paragraph(f'Campaign: {campaign.name}', styles['Heading2']))
    elements.append(Spacer(1, 12))

    total = Employee.objects.filter(company=company, is_active=True).count()
    rate = int((sessions.count() / total) * 100) if total > 0 else 0
    elements.append(Paragraph(
        f'Completion Rate: {rate}% ({sessions.count()}/{total})', styles['Normal']
    ))
    elements.append(Spacer(1, 12))

    data = [['Department', 'Avg Score', 'Severity', 'Responses']]
    dept_map = {}
    for s in sessions:
        dept = s.employee.department
        res, _ = calculate_score(s)
        if res:
            dept_map.setdefault(dept, {'scores': [], 'count': 0})
            dept_map[dept]['scores'].append(res.get('overall', 0))
            dept_map[dept]['count'] += 1

    for dept, info in dept_map.items():
        avg = sum(info['scores']) / len(info['scores'])
        sev = get_severity('PHQ-9', avg)
        data.append([dept, f'{avg:.1f}', sev, str(info['count'])])

    if len(data) > 1:
        table = Table(data, colWidths=[150, 100, 100, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.4, 0.6)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.Color(0.8, 0.8, 0.8)),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [colors.Color(0.95, 0.95, 0.95), colors.white]),
        ]))
        elements.append(table)
    else:
        elements.append(Paragraph('No data for this campaign.', styles['Normal']))

    elements.append(Spacer(1, 24))
    elements.append(Paragraph(
        'Scale: 0–4 Minimal | 5–9 Mild | 10–14 Moderate | 15+ Severe',
        styles['Normal']
    ))
    elements.append(Paragraph(
        'Aggregate data only. No individual results disclosed.', styles['Normal']
    ))

    doc.build(elements)
    return response


class QuestionnaireListView(generics.ListAPIView):
    queryset = Questionnaire.objects.all()
    serializer_class = QuestionnaireSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None


@api_view(['GET'])
def employee_lookup(request):
    company = get_object_or_404(Company, user=request.user)
    code = request.query_params.get('code', '').strip()
    if not code:
        return Response({'error': 'code parameter required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        employee = Employee.objects.get(
            company=company, anonymous_code=code, is_active=True
        )
    except (Employee.DoesNotExist, ValueError, ValidationError):
        employees = Employee.objects.filter(company=company, is_active=True)
        match = next((e for e in employees if e.code_short() == code.upper()), None)
        if not match:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        employee = match

    sessions = ScreeningSession.objects.filter(employee=employee).order_by('-campaign__created_at')
    return Response({
        'employee': EmployeeSerializer(employee).data,
        'sessions': [
            {
                'id': s.id,
                'campaign': s.campaign.name,
                'completed': s.is_completed(),
                'completed_at': s.completed_at,
                'result_url': f'/results/{s.unique_link_id}/',
            }
            for s in sessions
        ],
    })


class UserProfileView(generics.RetrieveAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    old = request.data.get('old_password')
    new = request.data.get('new_password')
    if not old or not new:
        return Response({'error': 'old_password and new_password are required'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new) < 8:
        return Response({'error': 'Password must be at least 8 characters'}, status=status.HTTP_400_BAD_REQUEST)
    if not request.user.check_password(old):
        return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
    request.user.set_password(new)
    request.user.save()
    return Response({'detail': 'Password changed successfully'})


@api_view(['GET'])
def csv_report(request, campaign_id):
    company = get_object_or_404(Company, user=request.user)
    campaign = get_object_or_404(Campaign, pk=campaign_id, company=company)
    sessions = ScreeningSession.objects.filter(campaign=campaign, completed_at__isnull=False).select_related('employee')

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="report_{campaign.name.replace(" ", "_")}.csv"'

    writer = csv.writer(response)
    writer.writerow(['Code', 'Department', 'Designation', 'Completed At', 'Overall Score', 'Questionnaire', 'Score', 'Max Score', 'Severity'])

    for s in sessions:
        res, q_data = calculate_score(s)
        if not res:
            continue
        overall = res.get('overall', '')
        for q_name in q_data:
            q_res = res.get(q_name, {})
            writer.writerow([
                s.employee.code_short(),
                s.employee.department,
                s.employee.designation,
                s.completed_at.strftime('%Y-%m-%d %H:%M') if s.completed_at else '',
                overall,
                q_name,
                q_res.get('score', ''),
                q_res.get('max', ''),
                q_res.get('severity', ''),
            ])

    return response
