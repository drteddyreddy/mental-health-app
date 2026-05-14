from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from screening.models import (
    Company, Employee, Campaign, Questionnaire,
    ScreeningSession, UserProfile, GradingConfig,
)
from screening.utils import calculate_score, get_severity
from .serializers import (
    CompanySerializer, CompanyDetailSerializer,
    QuestionnaireSerializer, GradingConfigSerializer,
    UserProfileSerializer,
)


class IsPsychiatrist(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_staff or
            getattr(getattr(request.user, 'profile', None), 'role', None) == 'psychiatrist'
        )


@api_view(['GET'])
def psy_dashboard(request):
    if not request.user.is_staff and getattr(getattr(request.user, 'profile', None), 'role', None) != 'psychiatrist':
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    companies = Company.objects.all()
    data = []
    for c in companies:
        total_emp = Employee.objects.filter(company=c, is_active=True).count()
        total_sessions = ScreeningSession.objects.filter(
            campaign__company=c, completed_at__isnull=False
        ).count()
        total_campaigns = Campaign.objects.filter(company=c).count()
        data.append({
            'id': c.id,
            'name': c.name,
            'tier': c.tier,
            'is_active': c.is_active,
            'total_employees': total_emp,
            'total_campaigns': total_campaigns,
            'total_sessions': total_sessions,
            'questionnaires_assigned': c.assigned_questionnaires.count(),
            'created_at': c.created_at,
        })
    return Response(data)


@api_view(['GET', 'PUT'])
def psy_company_detail(request, company_id):
    if not request.user.is_staff and getattr(getattr(request.user, 'profile', None), 'role', None) != 'psychiatrist':
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    company = get_object_or_404(Company, pk=company_id)

    if request.method == 'GET':
        serializer = CompanyDetailSerializer(company)
        return Response(serializer.data)

    # PUT: update company settings
    data = request.data
    if 'is_active' in data:
        company.is_active = data['is_active']
    if 'tier' in data:
        company.tier = data['tier']
    company.save()

    if 'assigned_questionnaire_ids' in data:
        q_ids = data['assigned_questionnaire_ids']
        company.assigned_questionnaires.set(Questionnaire.objects.filter(id__in=q_ids))

    return Response(CompanyDetailSerializer(company).data)


@api_view(['GET', 'PUT'])
def psy_grading_config(request, company_id):
    if not request.user.is_staff and getattr(getattr(request.user, 'profile', None), 'role', None) != 'psychiatrist':
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    company = get_object_or_404(Company, pk=company_id)

    if request.method == 'GET':
        config, _ = GradingConfig.objects.get_or_create(company=company)
        return Response(GradingConfigSerializer(config).data)

    # PUT
    config, created = GradingConfig.objects.get_or_create(company=company)
    serializer = GradingConfigSerializer(config, data={'rules': request.data.get('rules', {})}, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def psy_company_analytics(request, company_id):
    if not request.user.is_staff and getattr(getattr(request.user, 'profile', None), 'role', None) != 'psychiatrist':
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

    company = get_object_or_404(Company, pk=company_id)
    sessions = ScreeningSession.objects.filter(
        campaign__company=company, completed_at__isnull=False
    )
    campaigns = Campaign.objects.filter(company=company)

    # Department breakdown with grading
    dept_data = {}
    for s in sessions:
        dept = s.employee.department
        res, _ = calculate_score(s)
        if res:
            dept_data.setdefault(dept, {'scores': [], 'count': 0})
            dept_data[dept]['scores'].append(res.get('overall', 0))
            dept_data[dept]['count'] += 1

    department_breakdown = []
    for dept, info in dept_data.items():
        avg = round(sum(info['scores']) / len(info['scores']), 1) if info['scores'] else None
        grade = _compute_grade(avg, company) if avg is not None else None
        department_breakdown.append({
            'department': dept,
            'avg_score': avg,
            'grade': grade,
            'session_count': info['count'],
        })

    # Campaign trends
    campaign_trends = []
    for c in campaigns:
        c_sessions = ScreeningSession.objects.filter(campaign=c, completed_at__isnull=False)
        scores = []
        for s in c_sessions:
            res, _ = calculate_score(s)
            if res:
                scores.append(res.get('overall', 0))
        avg = round(sum(scores) / len(scores), 1) if scores else None
        campaign_trends.append({
            'name': c.name,
            'avg_score': avg,
            'grade': _compute_grade(avg, company) if avg is not None else None,
            'session_count': c_sessions.count(),
        })

    return Response({
        'company_name': company.name,
        'total_employees': Employee.objects.filter(company=company, is_active=True).count(),
        'total_campaigns': campaigns.count(),
        'total_sessions': sessions.count(),
        'department_breakdown': department_breakdown,
        'campaign_trends': campaign_trends,
    })


@api_view(['GET'])
def psy_questionnaires_list(request):
    if not request.user.is_staff and getattr(getattr(request.user, 'profile', None), 'role', None) != 'psychiatrist':
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
    questionnaires = Questionnaire.objects.all().prefetch_related('questions')
    return Response(QuestionnaireSerializer(questionnaires, many=True).data)


def _compute_grade(avg_score, company):
    try:
        cfg = GradingConfig.objects.get(company=company)
        boundaries = cfg.rules.get('grade_boundaries', {})
    except GradingConfig.DoesNotExist:
        boundaries = {}

    if not boundaries:
        boundaries = {'A': 6, 'B': 12, 'C': 18, 'D': 24, 'F': 999}

    for grade_name, threshold in sorted(boundaries.items(), key=lambda x: x[1]):
        if avg_score <= threshold:
            return grade_name
    return 'F'
