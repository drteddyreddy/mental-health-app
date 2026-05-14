from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views, psychiatrist

router = DefaultRouter()
router.register(r'employees', views.EmployeeViewSet, basename='employee')
router.register(r'campaigns', views.CampaignViewSet, basename='campaign')
router.register(r'sessions', views.ScreeningSessionViewSet, basename='session')

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='auth-register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='auth-login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', views.UserProfileView.as_view(), name='auth-me'),
    path('auth/change-password/', views.change_password, name='auth-change-password'),

    # Company
    path('company/', views.CompanyView.as_view(), name='company'),
    path('questionnaires/', views.QuestionnaireListView.as_view(), name='questionnaires'),

    # Employees
    path('employees/lookup/', views.employee_lookup, name='employee-lookup'),

    # Campaigns
    path('campaigns/<int:pk>/sessions/', views.CampaignViewSet.as_view({'get': 'sessions'}), name='campaign-sessions'),
    path('campaigns/<int:campaign_id>/report.pdf/', views.pdf_report, name='pdf-report'),
    path('campaigns/<int:campaign_id>/report.csv/', views.csv_report, name='csv-report'),

    # Anonymous screening
    path('screening/<uuid:link_id>/', views.screening_view, name='screening'),
    path('results/<uuid:link_id>/', views.result_view, name='result'),

    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),

    # Psychiatrist
    path('psy/dashboard/', psychiatrist.psy_dashboard, name='psy-dashboard'),
    path('psy/companies/<int:company_id>/', psychiatrist.psy_company_detail, name='psy-company-detail'),
    path('psy/companies/<int:company_id>/grading/', psychiatrist.psy_grading_config, name='psy-grading'),
    path('psy/companies/<int:company_id>/analytics/', psychiatrist.psy_company_analytics, name='psy-analytics'),
    path('psy/questionnaires/', psychiatrist.psy_questionnaires_list, name='psy-questionnaires'),

    # Router
    path('', include(router.urls)),
]
