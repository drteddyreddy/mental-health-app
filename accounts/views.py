from django.contrib.auth import login
from django.shortcuts import redirect, render

from .forms import HRRegistrationForm


def register(request):
    if request.method == "POST":
        form = HRRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect("screening:company_setup")
    else:
        form = HRRegistrationForm()
    return render(request, "accounts/register.html", {"form": form})
