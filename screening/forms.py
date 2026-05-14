from django import forms

from .models import Campaign, Company


class CompanyForm(forms.ModelForm):
    class Meta:
        model = Company
        fields = ["name", "industry", "tier"]
        widgets = {
            "name": forms.TextInput(attrs={"class": "form-control"}),
            "industry": forms.TextInput(attrs={"class": "form-control"}),
            "tier": forms.Select(attrs={"class": "form-select"}),
        }


class CSVUploadForm(forms.Form):
    csv_file = forms.FileField(
        label="Upload CSV File",
        help_text="CSV must have columns: name, department, designation",
        widget=forms.FileInput(attrs={"class": "form-control", "accept": ".csv"}),
    )


class CampaignForm(forms.ModelForm):
    class Meta:
        model = Campaign
        fields = ["name", "start_date", "end_date", "questionnaires", "is_active"]
        widgets = {
            "name": forms.TextInput(attrs={"class": "form-control", "placeholder": "e.g. Q2 2026"}),
            "start_date": forms.DateInput(attrs={"class": "form-control", "type": "date"}),
            "end_date": forms.DateInput(attrs={"class": "form-control", "type": "date"}),
            "questionnaires": forms.CheckboxSelectMultiple(),
            "is_active": forms.CheckboxInput(attrs={"class": "form-check-input"}),
        }


class ScreeningForm(forms.Form):
    pass
