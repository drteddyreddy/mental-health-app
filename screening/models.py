import uuid
from django.db import models
from django.contrib.auth.models import User


class Company(models.Model):
    TIER_CHOICES = [('basic', 'Basic'), ('pro', 'Pro')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='company')
    name = models.CharField(max_length=200)
    industry = models.CharField(max_length=100, blank=True)
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default='basic')
    assigned_questionnaires = models.ManyToManyField('Questionnaire', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Employee(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='employees')
    name = models.CharField(max_length=200)
    department = models.CharField(max_length=100)
    designation = models.CharField(max_length=100)
    anonymous_code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code_short()})"

    def code_short(self):
        return str(self.anonymous_code)[:8].upper()


class Campaign(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='campaigns')
    name = models.CharField(max_length=200, help_text="e.g. Q2 2026")
    start_date = models.DateField()
    end_date = models.DateField()
    questionnaires = models.ManyToManyField('Questionnaire')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class Questionnaire(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    scoring_type = models.CharField(max_length=20, default='sum')
    max_score = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name


class Question(models.Model):
    questionnaire = models.ForeignKey(Questionnaire, on_delete=models.CASCADE, related_name='questions')
    text = models.CharField(max_length=500)
    order = models.IntegerField()
    max_score = models.IntegerField(default=3)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.questionnaire.name} Q{self.order}: {self.text[:50]}"


class ScreeningSession(models.Model):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='sessions')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='sessions')
    unique_link_id = models.UUIDField(default=uuid.uuid4, unique=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['campaign', 'employee']

    def __str__(self):
        return f"Session {self.employee.code_short()} - {self.campaign.name}"

    def is_completed(self):
        return self.completed_at is not None


class ScreeningResponse(models.Model):
    session = models.ForeignKey(ScreeningSession, on_delete=models.CASCADE, related_name='responses')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    score = models.IntegerField()

    class Meta:
        unique_together = ['session', 'question']

    def __str__(self):
        return f"{self.session} - Q{self.question.order}: {self.score}"


class UserProfile(models.Model):
    ROLE_CHOICES = [('psychiatrist', 'Psychiatrist'), ('hr', 'HR Admin')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='hr')

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class GradingConfig(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='grading_config')
    rules = models.JSONField(default=dict, blank=True,
        help_text='Psychiatrist-defined grading rules. Example: {"grade_boundaries": {"A": 10, "B": 20, "C": 30, "D": 40, "F": 100}, "composite_formula": "average", "scale_weights": {"PHQ-9": 1.0, "GAD-7": 1.0}}')

    def __str__(self):
        return f"Grading config for {self.company.name}"
