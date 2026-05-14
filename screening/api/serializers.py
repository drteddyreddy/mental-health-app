from rest_framework import serializers

from screening.models import (
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


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "text", "order", "max_score"]


class QuestionnaireSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Questionnaire
        fields = ["id", "name", "description", "scoring_type", "max_score", "metadata", "questions"]


class GradingConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = GradingConfig
        fields = ["id", "rules"]


class CompanySerializer(serializers.ModelSerializer):
    assigned_questionnaires = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "industry",
            "tier",
            "is_active",
            "assigned_questionnaires",
            "created_at",
        ]
        read_only_fields = ["id", "tier", "created_at"]

    def get_assigned_questionnaires(self, obj):
        return list(obj.assigned_questionnaires.values_list("id", flat=True))


class CompanyDetailSerializer(serializers.ModelSerializer):
    assigned_questionnaires_data = QuestionnaireSerializer(
        source="assigned_questionnaires", many=True, read_only=True
    )
    grading_config = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "industry",
            "tier",
            "is_active",
            "assigned_questionnaires_data",
            "grading_config",
            "created_at",
        ]

    def get_grading_config(self, obj):
        try:
            cfg = GradingConfig.objects.get(company=obj)
            return GradingConfigSerializer(cfg).data
        except GradingConfig.DoesNotExist:
            return None


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.ReadOnlyField(source="user.username")
    email = serializers.ReadOnlyField(source="user.email")

    class Meta:
        model = UserProfile
        fields = ["id", "username", "email", "role"]


class EmployeeSerializer(serializers.ModelSerializer):
    code_short = serializers.ReadOnlyField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "name",
            "department",
            "designation",
            "anonymous_code",
            "code_short",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "anonymous_code", "code_short", "created_at"]


class EmployeeUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        if not value.name.endswith(".csv"):
            raise serializers.ValidationError("File must be a CSV.")
        return value


class CampaignListSerializer(serializers.ModelSerializer):
    questionnaires = QuestionnaireSerializer(many=True, read_only=True)
    total_sessions = serializers.SerializerMethodField()
    completed_sessions = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "start_date",
            "end_date",
            "is_active",
            "questionnaires",
            "total_sessions",
            "completed_sessions",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_total_sessions(self, obj):
        return obj.sessions.count()

    def get_completed_sessions(self, obj):
        return obj.sessions.filter(completed_at__isnull=False).count()


class CampaignDetailSerializer(serializers.ModelSerializer):
    questionnaires = QuestionnaireSerializer(many=True, read_only=True)

    class Meta:
        model = Campaign
        fields = [
            "id",
            "name",
            "start_date",
            "end_date",
            "is_active",
            "questionnaires",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class CampaignCreateSerializer(serializers.ModelSerializer):
    questionnaire_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)

    class Meta:
        model = Campaign
        fields = ["name", "start_date", "end_date", "is_active", "questionnaire_ids"]

    def create(self, validated_data):
        q_ids = validated_data.pop("questionnaire_ids")
        company = self.context["company"]
        campaign = Campaign.objects.create(company=company, **validated_data)
        campaign.questionnaires.set(Questionnaire.objects.filter(id__in=q_ids))
        for emp in Employee.objects.filter(company=company, is_active=True):
            ScreeningSession.objects.get_or_create(campaign=campaign, employee=emp)
        return campaign


class ScreeningSessionSerializer(serializers.ModelSerializer):
    employee_code = serializers.ReadOnlyField(source="employee.code_short")
    employee_department = serializers.ReadOnlyField(source="employee.department")
    unique_link = serializers.SerializerMethodField()
    is_completed = serializers.ReadOnlyField()

    class Meta:
        model = ScreeningSession
        fields = [
            "id",
            "employee_code",
            "employee_department",
            "unique_link",
            "is_completed",
            "completed_at",
            "created_at",
        ]

    def get_unique_link(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(f"/screening/{obj.unique_link_id}/")
        return str(obj.unique_link_id)


class ScreeningResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScreeningResponse
        fields = ["question", "score"]


class ScreeningSubmitSerializer(serializers.Serializer):
    responses = ScreeningResponseSerializer(many=True)


class ResultEntrySerializer(serializers.Serializer):
    questionnaire_name = serializers.CharField()
    score = serializers.IntegerField()
    max_score = serializers.IntegerField()
    severity = serializers.CharField()
    recommendations = serializers.ListField(child=serializers.CharField())


class ResultSerializer(serializers.Serializer):
    results = ResultEntrySerializer(many=True)
    overall_score = serializers.IntegerField()


class DepartmentBreakdownSerializer(serializers.Serializer):
    department = serializers.CharField()
    emp_count = serializers.IntegerField()
    session_count = serializers.IntegerField()
    avg_score = serializers.FloatField(allow_null=True)


class CampaignTrendSerializer(serializers.Serializer):
    name = serializers.CharField()
    avg_score = serializers.FloatField(allow_null=True)
    session_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class DashboardStatsSerializer(serializers.Serializer):
    total_employees = serializers.IntegerField()
    total_campaigns = serializers.IntegerField()
    total_sessions = serializers.IntegerField()
    completion_rate = serializers.IntegerField()
    department_breakdown = DepartmentBreakdownSerializer(many=True)
    severity_distribution = serializers.DictField(child=serializers.IntegerField())
    campaign_trends = CampaignTrendSerializer(many=True)
