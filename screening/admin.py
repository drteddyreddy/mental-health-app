from django.contrib import admin

from .models import (
    Campaign,
    Company,
    Employee,
    Question,
    Questionnaire,
    ScreeningResponse,
    ScreeningSession,
)

admin.site.register(Company)
admin.site.register(Employee)
admin.site.register(Campaign)
admin.site.register(Questionnaire)
admin.site.register(Question)
admin.site.register(ScreeningSession)
admin.site.register(ScreeningResponse)
