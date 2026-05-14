import logging

from celery import shared_task
from django.utils import timezone

from .mail import send_reminder, send_screening_link
from .models import Campaign, ScreeningSession

logger = logging.getLogger(__name__)


@shared_task
def send_campaign_links(campaign_id: int):
    try:
        campaign = Campaign.objects.get(pk=campaign_id)
    except Campaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found")
        return

    company = campaign.company
    if not company.user.email:
        logger.warning(f"No email for company {company.name}")
        return

    sessions = ScreeningSession.objects.filter(campaign=campaign).select_related("employee")
    links = []
    for s in sessions:
        links.append(
            {
                "code": s.employee.code_short(),
                "department": s.employee.department,
                "url": f"/screening/{s.unique_link_id}/",
            }
        )

    send_screening_link(company.user.email, company.name, campaign.name, links)
    logger.info(f"Campaign links sent for {campaign.name} ({len(links)} employees)")


@shared_task
def send_reminder_for_campaign(campaign_id: int):
    try:
        campaign = Campaign.objects.get(pk=campaign_id)
    except Campaign.DoesNotExist:
        logger.error(f"Campaign {campaign_id} not found")
        return

    company = campaign.company
    if not company.user.email:
        return

    pending = ScreeningSession.objects.filter(campaign=campaign, completed_at__isnull=True)
    pending_count = pending.count()
    if pending_count == 0:
        return

    send_reminder(company.user.email, company.name, campaign.name, pending_count)
    logger.info(f"Reminder sent for {campaign.name} ({pending_count} pending)")


@shared_task
def send_reminders_for_all_active_campaigns():
    now = timezone.now()
    active = Campaign.objects.filter(is_active=True, start_date__lte=now, end_date__gte=now)
    for campaign in active:
        send_reminder_for_campaign.delay(campaign.id)


@shared_task
def auto_close_expired_campaigns():
    now = timezone.now()
    expired = Campaign.objects.filter(is_active=True, end_date__lt=now)
    count = expired.update(is_active=False)
    if count:
        logger.info(f"Auto-closed {count} expired campaign(s)")
