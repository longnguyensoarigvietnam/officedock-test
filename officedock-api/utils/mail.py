from django.conf import settings
from django.core.mail import send_mail

from base.constants import (
    DEFAULT_TOKEN_HOURS_EXPIRATION,
    OTP_TOKEN_MINUTES_EXPIRATION,
)


class MailService:
    """
    MailService class is used to send mail messages.
    """

    def __init__(
        self, from_email=settings.EMAIL_SENDER, name_sender=settings.NAME_SENDER
    ):
        """
        MailService constructor.
        """

        self.from_email = from_email
        self.name_sender = name_sender

    def send(self, subject, message, recipient_list):
        """
        Regular email sending.
        """

        send_mail(
            subject=subject,
            message="",
            from_email=f"{self.name_sender} <{self.from_email}>",
            recipient_list=recipient_list,
            html_message=message,
        )

    def send_register_otp(self, recipient, otp_code):
        """
        Send an email with a register otp code.
        """

        # FIXME: Replace email template later

        subject = "【Office Dock】二要素認証コード通知"
        message = f"""
                <p>二要素認証のための確認コードをお知らせします。</p>
                <p>確認コード：<b>{otp_code}</b></p>
                <p>※確認コードの有効期限は{int(DEFAULT_TOKEN_HOURS_EXPIRATION)}時間です。</p>
            """

        self.send(subject, message, [recipient])

    def send_system_login_otp(self, user_name, recipient, otp_code):
        """
        Send an otp email.
        """

        # FIXME: Replace email template later

        subject = "【Office Dock】二要素認証コード通知"
        message = f"""
            <p>{user_name} 様</p>
            <p>二要素認証のための確認コードをお知らせします。</p>
            <p>確認コード：<b>{otp_code}</b></p>
            <p>※確認コードの有効期限は{int(OTP_TOKEN_MINUTES_EXPIRATION)}分間です。</p>
        """

        self.send(subject, message, [recipient])

    def send_admin_login_otp(self, recipient, otp_code):
        """
        Send an otp email.
        """

        # FIXME: Replace email template later

        subject = "【Office Dock】二要素認証コード通知"
        message = f"""
            <p>二要素認証のための確認コードをお知らせします。</p>
            <p>確認コード：<b>{otp_code}</b></p>
            <p>※確認コードの有効期限は{int(OTP_TOKEN_MINUTES_EXPIRATION)}分間です。</p>
        """

        self.send(subject, message, [recipient])

    def send_system_forgot_password(self, recipient, token):
        """
        Send a forgot password email for system.
        """

        # FIXME: Replace email template later

        url = f"{settings.SYSTEM_WEBAPP_URL}/reset-password/?token={token}"
        subject = "【Office Dock】パスワード再発行のご案内"
        message = f"""
            <p>下記URLをクリックしてパスワードの再設定を行ってください。<br>
            ※URLの有効期限は{int(DEFAULT_TOKEN_HOURS_EXPIRATION)}時間です。</p>
            <a href="{url}">{url}</a>
        """

        self.send(subject, message, [recipient])

    def send_admin_forgot_password(self, recipient, token):
        """
        Send a forgot password email for admin.
        """

        # FIXME: Replace email template later

        url = f"{settings.ADMIN_WEBAPP_URL}/reset-password/?token={token}"
        subject = "【Office Dock】パスワード再発行のご案内"
        message = f"""
            <p>下記URLをクリックしてパスワードの再設定を行ってください。<br>
            ※URLの有効期限は{int(DEFAULT_TOKEN_HOURS_EXPIRATION)}時間です。</p>
            <a href="{url}">{url}</a>
        """

        self.send(subject, message, [recipient])

    def send_system_invite_user_by_id(
        self, recipient, username, password, invite_by
    ):
        """
        Send an invited user email.
        """

        # FIXME: Replace email template later

        subject = f"【Office Dock】{username}さんをOfficeDockの{invite_by}に招待しました。"
        message = f"""
            <p>下記はアカウント情報です。<br>
                ID: {username}<br>
                パスワード: {password}
            </p>
        """

        self.send(subject, message, [recipient])

    def send_system_invite_user_by_email(self, recipient, password, invite_by):
        """
        Send an invited user email.
        """

        # FIXME: Replace email template later

        subject = f"【Office Dock】{invite_by}からOfficeDockに招待されました"
        message = f"""
            <p>{invite_by} の管理者があなたを招待しました。<p>
            <p>これはアカウント情報です。<br>
                メールアドレス: {recipient}<br>
                パスワード: {password}
            </p>
        """

        self.send(subject, message, [recipient])

    def send_admin_invite_user(self, recipient, password, user):
        """
        Send an invited user email.
        """

        # FIXME: Replace email template later

        subject = "【Office Dock】OfficeDockに招待されました"
        title_message = "OfficeDockの管理者があなたを招待しました。"

        if hasattr(user, "profile"):
            subject = (
                f"【Office Dock】{user.profile.full_name}の管理者からOfficeDockに招待されました"
            )
            title_message = f"{user.profile.full_name}の管理者があなたを招待しました。"

        message = f"""
            <p>{title_message}<p>
            <p>これはアカウント情報です。<br>
                メールアドレス: {recipient}<br>
                パスワード: {password}
            </p>
        """

        self.send(subject, message, [recipient])

    def send_admin_create_company_by_email(self, recipient, password, company):
        """
        Send an invited company email.
        """

        # FIXME: Replace email template later

        subject = f"【Office Dock】管理者からOfficeDockの{company.name}に招待されました"
        message = f"""
            <p>管理者があなたを{company.name}に招待しました。<p>
            <p>これはアカウント情報です。<br>
                メールアドレス: {recipient}<br>
                パスワード: {password}
            </p>
        """

        self.send(subject, message, [recipient])
