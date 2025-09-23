from django.conf import settings
from django.core.mail import send_mail

from base.constants import (
    DEFAULT_TOKEN_HOURS_EXPIRATION,
    OTP_TOKEN_MINUTES_EXPIRATION,
)


class MailService:
    """
    Core email service used across the application.

    - Wraps Django's email backend to send HTML emails with a branded From header.
    - Reads `EMAIL_SENDER` and `NAME_SENDER` from settings.
    - Provides common helpers for OTP, password reset, and invitations; payment/billing
      notifications are implemented in `PaymentEmailService`.

    Notes:
    - `message` passed to `send(...)` is used as the HTML body (`html_message`).
    - For better deliverability, consider adding a text/plain alternative.
    - Avoid including sensitive data (e.g., passwords) directly in email bodies; prefer
      one-time links or tokens.
    """

    SYSTEM_NAME = "OFFICE DOCK"

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

        subject = f"【{self.SYSTEM_NAME}】二要素認証コード通知"
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

        subject = f"【{self.SYSTEM_NAME}】二要素認証コード通知"
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

        subject = f"【{self.SYSTEM_NAME}】二要素認証コード通知"
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
        subject = f"【{self.SYSTEM_NAME}】パスワード再発行のご案内"
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
        subject = f"【{self.SYSTEM_NAME}】パスワード再発行のご案内"
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

        subject = f"【{self.SYSTEM_NAME}】{username}さんを{self.SYSTEM_NAME}の{invite_by}に招待しました。"
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

        subject = f"【{self.SYSTEM_NAME}】{invite_by}から{self.SYSTEM_NAME}に招待されました"
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

        subject = f"【{self.SYSTEM_NAME}】{self.SYSTEM_NAME}に招待されました"
        title_message = "{self.SYSTEM_NAME}の管理者があなたを招待しました。"

        if hasattr(user, "profile"):
            subject = f"【{self.SYSTEM_NAME}】{user.profile.full_name}の管理者から{self.SYSTEM_NAME}に招待されました"
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

        subject = f"【{self.SYSTEM_NAME}】管理者から{self.SYSTEM_NAME}の{company.name}に招待されました"
        message = f"""
            <p>管理者があなたを{company.name}に招待しました。<p>
            <p>これはアカウント情報です。<br>
                メールアドレス: {recipient}<br>
                パスワード: {password}
            </p>
        """

        self.send(subject, message, [recipient])


class PaymentMailService(MailService):
    """
    Email utilities for payment and billing lifecycle events.

    Provides HTML email notifications for:
    - account issuance/added/restoration
    - point (coin) purchase
    - automatic plan upgrade
    - contract renewal notice/cancellation (request and completion)
    - monthly billing success/failure (first/final)
    - service suspension/restoration
    """

    def send_account_issued(
        self, recipient, company_name, responsible_name, user_email, password
    ):
        """
        Notification email when a new account is issued
        """
        subject = f"【{self.SYSTEM_NAME}】アカウント発行のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>この度は{self.SYSTEM_NAME}にお申し込みいただき、誠にありがとうございます。</p>
            <p>アカウントの発行が完了いたしましたので、下記の通りお知らせいたします。</p>
            <p>
                ■ ログイン情報<br>
                ログインID： {user_email}<br>
                初期パスワード： {password}<br>
                ログインURL： <a href="{settings.SYSTEM_WEBAPP_URL}">{settings.SYSTEM_WEBAPP_URL}</a>
            </p>
            <p>初回ログイン時には、セキュリティのためパスワードの変更をお願いいたします。</p>
        """
        self.send(subject, message, [recipient])

    def send_account_added(
        self,
        recipient,
        company_name,
        responsible_name,
        new_user_name,
        new_user_email,
    ):
        """
        Notification email when an account is added
        """
        subject = f"【{self.SYSTEM_NAME}】新規ユーザーアカウント追加のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、ありがとうございます。</p>
            <p>貴社のアカウントに新しいユーザーが追加されましたので、お知らせいたします。</p>
            <p>
                ■ 追加ユーザー情報<br>
                氏名： {new_user_name}<br>
                ログインID： {new_user_email}
            </p>
            <p>追加されたユーザー様には別途、ログイン情報が通知されます。<br>
            アカウントの管理は、ユーザー管理画面よりご確認いただけます。</p>
        """
        self.send(subject, message, [recipient])

    def send_account_restored(self, recipient, company_name, responsible_name):
        """
        Notification email when an account is restored
        """
        subject = f"【{self.SYSTEM_NAME}】アカウント復元とサービス利用再開のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、ありがとうございます。</p>
            <p>アカウントの復元手続きが完了し、本日よりサービスの利用が再開されましたことをお知らせいたします。<br>
            なお、課金は翌月1日より再開されます。（今月分のご利用料金は発生いたしません）</p>
        """
        self.send(subject, message, [recipient])

    def send_point_purchased(
        self, recipient, company_name, responsible_name, amount, price
    ):
        """
        Notification email when point (coin) purchase is completed
        """
        subject = f"【{self.SYSTEM_NAME}】コインご購入完了のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、ありがとうございます。</p>
            <p>コインのご購入手続きが完了いたしました。</p>
            <p>
                ■ ご購入内容<br>
                購入コイン： {amount}<br>
                お支払い金額： {price} 円（税込）
            </p>
            <p>今回のお支払い金額は、翌月のご利用料金と合わせてご請求させていただきます。</p>
        """
        self.send(subject, message, [recipient])

    def send_plan_auto_upgrade(
        self,
        recipient,
        company_name,
        responsible_name,
        old_plan,
        new_plan,
        start_month,
        new_price,
    ):
        """
        Notification email when plan is automatically upgraded
        """
        subject = f"【{self.SYSTEM_NAME}】ご利用プランの自動アップグレードのお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、ありがとうございます。</p>
            <p>ご利用アカウント数の増加に伴い、貴社のご契約プランが以下の通り自動でアップグレードされました。</p>
            <p>
                ■ プラン変更内容<br>
                変更前プラン： {old_plan}<br>
                変更後プラン： {new_plan}
            </p>
            <p>
                ■ 料金の変更について<br>
                適用開始月： {start_month} ご利用分より<br>
                次回ご請求金額： {new_price} 円（税込）
            </p>
        """
        self.send(subject, message, [recipient])

    def send_contract_renewal_notice(
        self,
        recipient,
        company_name,
        responsible_name,
        renewal_date,
        plan,
        price,
    ):
        """
        Notification email one month before contract renewal
        """
        subject = f"【{self.SYSTEM_NAME}】ご契約更新のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、ありがとうございます。</p>
            <p>ご契約の更新が近づいてまいりました。下記の内容で自動的に1年間更新されます。</p>
            <p>
                ■ 更新内容<br>
                契約更新日： {renewal_date}<br>
                更新後プラン： {plan}<br>
                更新後料金： {price} 円/月（税込）
            </p>
        """
        self.send(subject, message, [recipient])

    def send_monthly_payment_success(
        self,
        recipient,
        company_name,
        responsible_name,
        usage_month,
        billing_date,
        amount,
        period,
    ):
        """
        Notification email when monthly recurring payment is successful
        """
        subject = f"【{self.SYSTEM_NAME}】{usage_month}分 ご利用料金の決済完了のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>{usage_month}分のご利用料金につきまして、決済が完了いたしましたのでお知らせいたします。</p>
            <p>
                決済日： {billing_date}<br>
                ご請求金額： {amount} 円（税込）<br>
                対象期間： {period}
            </p>
        """
        self.send(subject, message, [recipient])

    def send_payment_failed_first(
        self,
        recipient,
        company_name,
        responsible_name,
        usage_month,
        payment_url,
    ):
        """
        Notification email when the first payment attempt fails
        """
        subject = f"【{self.SYSTEM_NAME}】ご利用料金のお支払いエラーのお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>{usage_month}分のご利用料金につきまして、登録済みのお支払い方法で決済が完了しませんでした。</p>
            <p>現在、サービスの利用は継続可能ですが、お支払い情報に問題がある可能性がございます。</p>
            <p>
                ▼お支払い方法の確認・変更はこちら<br>
                <a href="{payment_url}">{payment_url}</a>
            </p>
            <p>本メール配信後、システムによる決済の再試行が自動的に開始されます。<br>
            期間中にお支払いが確認できない場合、サービスが一時停止されることがございます。</p>
        """
        self.send(subject, message, [recipient])

    def send_payment_failed_final(
        self,
        recipient,
        company_name,
        responsible_name,
        usage_month,
        payment_url,
    ):
        """
        Notification email when all payment retries failed (service suspended)
        """
        subject = f"【{self.SYSTEM_NAME}】サービス利用停止のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>{usage_month}分のご利用料金につきまして、再試行を重ねましたが決済の確認が取れませんでした。</p>
            <p>誠に不本意ながら、本日よりサービスのご利用を一時的に停止させていただきました。</p>
            <p>
                ▼お支払い手続きはこちら<br>
                <a href="{payment_url}">{payment_url}</a>
            </p>
        """
        self.send(subject, message, [recipient])

    def send_service_restored(self, recipient, company_name, responsible_name):
        """
        Notification email when service is restored after payment succeeds
        """
        subject = f"【{self.SYSTEM_NAME}】サービス利用再開のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>お支払い情報の更新と未払い料金の決済が確認できました。</p>
            <p>一時停止しておりましたサービスの利用を本日より再開いたしましたのでお知らせいたします。</p>
        """
        self.send(subject, message, [recipient])

    def send_contract_cancellation_request(
        self, recipient, company_name, responsible_name, end_date
    ):
        """
        Notification email when a contract cancellation request is received
        """
        subject = f"【{self.SYSTEM_NAME}】解約手続き完了のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>{self.SYSTEM_NAME}の解約予約手続きを承りました。<br>
            契約終了予定日： {end_date}</p>
            <p>契約終了日までサービスは引き続きご利用いただけます。</p>
        """
        self.send(subject, message, [recipient])

    def send_contract_cancelled(
        self, recipient, company_name, responsible_name, end_date
    ):
        """
        Notification email when a contract is cancelled
        """
        subject = f"【{self.SYSTEM_NAME}】解約手続き完了のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>{end_date} をもちまして、{self.SYSTEM_NAME}のご契約が満了となり、解約手続きがすべて完了いたしました。</p>
            <p>貴社のアカウントはご利用いただけなくなります。<br>
            データは解約後2ヶ月間保持された後、完全に削除されます。</p>
        """
        self.send(subject, message, [recipient])
