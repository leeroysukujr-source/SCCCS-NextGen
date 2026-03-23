import os
import smtplib
from email.message import EmailMessage

MAIL_SERVER = os.getenv('MAIL_SERVER')
MAIL_PORT = int(os.getenv('MAIL_PORT', 587))
MAIL_USERNAME = os.getenv('MAIL_USERNAME')
MAIL_PASSWORD = os.getenv('MAIL_PASSWORD')
MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'true').lower() in ['1', 'true', 'yes']
MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'false').lower() in ['1', 'true', 'yes']
MAIL_FROM = os.getenv('MAIL_FROM', MAIL_USERNAME)


def send_email(to_email, subject, html_body=None, text_body=None):
    """Send a simple email using SMTP settings from env vars.

    Returns True on success, False on failure.
    """
    if not MAIL_SERVER or not MAIL_USERNAME or not MAIL_PASSWORD:
        # Mail not configured
        return False

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = MAIL_FROM
    msg['To'] = to_email

    if html_body and not text_body:
        text_body = 'Please view this email in an HTML-compatible client.'

    if text_body:
        msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype='html')

    try:
        if MAIL_USE_SSL:
            with smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT) as server:
                server.login(MAIL_USERNAME, MAIL_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP(MAIL_SERVER, MAIL_PORT) as server:
                if MAIL_USE_TLS:
                    server.starttls()
                server.login(MAIL_USERNAME, MAIL_PASSWORD)
                server.send_message(msg)
        return True
    except Exception as e:
        try:
            # best-effort logging
            print(f"Email send error: {e}")
        except Exception:
            pass
        return False
