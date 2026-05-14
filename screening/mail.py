import logging
from django.conf import settings

logger = logging.getLogger(__name__)

try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail, From, To
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    if not settings.USE_EMAIL:
        logger.info(f'Email disabled. Would send to {to_email}: {subject}')
        return False

    if not SENDGRID_AVAILABLE:
        logger.warning('SendGrid package not installed')
        return False

    if not settings.SENDGRID_API_KEY:
        logger.warning('SENDGRID_API_KEY not configured')
        return False

    try:
        message = Mail(
            from_email=From(settings.EMAIL_FROM, 'MindWell'),
            to_emails=To(to_email),
            subject=subject,
            html_content=html_content,
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f'Email sent to {to_email}: {response.status_code}')
        return response.status_code in (200, 201, 202)
    except Exception as e:
        logger.error(f'Failed to send email to {to_email}: {e}')
        return False


def send_screening_link(company_email: str, company_name: str, campaign_name: str, links: list[dict]) -> bool:
    rows = ''.join(
        f'<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;font-family:monospace;font-size:13px">{l["code"]}</td>'
        f'<td style="padding:8px;border-bottom:1px solid #e2e8f0">{l["department"]}</td>'
        f'<td style="padding:8px;border-bottom:1px solid #e2e8f0"><a href="{l["url"]}" style="color:#0d6e6e;text-decoration:underline;font-size:13px">Open Screening</a></td></tr>'
        for l in links
    )

    html = f'''
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;background:#f8fafc">
    <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <h1 style="color:#0d6e6e;margin:0 0 4px">MindWell</h1>
        <p style="color:#475569;font-size:14px">Campaign: <strong>{campaign_name}</strong></p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <p style="color:#334155;font-size:14px">Anonymous screening links for <strong>{company_name}</strong>:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
            <thead>
            <tr style="background:#f1f5f9">
                <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b">Code</th>
                <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b">Department</th>
                <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b">Link</th>
            </tr>
            </thead>
            <tbody>
            {rows}
            </tbody>
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            This is an automated message from MindWell. No personal data is attached to these links.
        </p>
    </div>
    </body>
    </html>
    '''
    return send_email(company_email, f'New Screening Campaign: {campaign_name}', html)


def send_reminder(hr_email: str, company_name: str, campaign_name: str, pending_count: int) -> bool:
    html = f'''
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:24px;background:#f8fafc">
    <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <h1 style="color:#0d6e6e;margin:0 0 4px">MindWell</h1>
        <p style="color:#475569;font-size:14px">Reminder — <strong>{campaign_name}</strong></p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
        <p style="color:#334155;font-size:14px"><strong>{pending_count}</strong> employee(s) have not yet completed their screening for <strong>{company_name}</strong>.</p>
        <p style="color:#475569;font-size:14px">Log in to your dashboard to view pending links and send reminders.</p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">This is an automated reminder from MindWell.</p>
    </div>
    </body>
    </html>
    '''
    return send_email(hr_email, f'Reminder: {pending_count} Pending Screenings — {campaign_name}', html)
