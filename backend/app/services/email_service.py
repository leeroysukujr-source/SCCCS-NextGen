import os
from threading import Thread
from flask import current_app, render_template
from flask_mail import Message
from app import mail
from datetime import datetime
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail as SGMail

class EmailService:
    @staticmethod
    def _send_async_dual(app, subject, recipient, html_body, sender):
        with app.app_context():
            sent = False
            
            # 1. Try SendGrid
            if app.config.get('SENDGRID_API_KEY'):
                try:
                    sg_msg = SGMail(
                        from_email=sender,
                        to_emails=recipient,
                        subject=subject,
                        html_content=html_body
                    )
                    sg = SendGridAPIClient(app.config.get('SENDGRID_API_KEY'))
                    response = sg.send(sg_msg)
                    if 200 <= response.status_code < 300:
                        app.logger.info(f"Email sent via SendGrid to {recipient}")
                        sent = True
                except Exception as e:
                    app.logger.error(f"SendGrid failed to {recipient}: {e}")
            
            # 2. Failover to Gmail (Flask-Mail)
            # Only try if SendGrid wasn't attempted or failed
            if not sent and app.config.get('GMAIL_USERNAME'):
                try:
                    app.logger.info(f"Attempting failover to Gmail for {recipient}...")
                    # Assuming Flask-Mail is configured with Gmail creds in MAIL_SERVER variables
                    msg = Message(subject=subject, recipients=[recipient], html=html_body, sender=sender)
                    mail.send(msg)
                    app.logger.info(f"Email sent via Gmail to {recipient}")
                    sent = True
                except Exception as e:
                    app.logger.error(f"Gmail failed to {recipient}: {e}")

            if not sent:
                app.logger.error(f"CRITICAL: Failed to send email to {recipient} via ALL providers.")

    @staticmethod
    def send_email(to, subject, template, **kwargs):
        """
        Send an email asynchronously with dual-provider redundancy.
        """
        app = current_app._get_current_object()
        
        # Inject common context
        kwargs['year'] = datetime.utcnow().year
        
        # Render HTML
        try:
            html_body = render_template(f"email/{template}.html", **kwargs)
        except Exception as e:
            app.logger.error(f"Template rendering failed: {e}")
            html_body = f"<p>Error rendering template. content: {kwargs}</p>"

        sender = app.config.get('MAIL_DEFAULT_SENDER')
        full_subject = f"SCCCS - {subject}"

        # Dev Mode Simulation Check
        if not app.config.get('SENDGRID_API_KEY') and not app.config.get('GMAIL_USERNAME'):
            app.logger.warning("No Email Providers configured. Email suppressed.")
            app.logger.info(f"--- EMAIL SIMULATION ---\nTo: {to}\nSubject: {full_subject}\nProvider: NULL (Simulated)\n------------------------")
            return

        # Async Dispatch
        thr = Thread(target=EmailService._send_async_dual, args=(app, full_subject, to, html_body, sender))
        thr.start()

    @staticmethod
    def send_password_reset(to, reset_url):
        EmailService.send_email(
            to=to,
            subject="Reset Password",
            template="reset_password",
            reset_url=reset_url
        )
