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
        footer_html = f"""
        <p>
        -------- <br>
        アステッキホールディングス株式会社 <br>
        {self.SYSTEM_NAME}（オフィスドック） サポートチーム <br>
        Email：{settings.MAIL_TEMPLATE_FOOTER_EMAIL} <br>
        サービスサイト：{settings.MAIL_TEMPLATE_FOOTER_ADDRESS} <br>
        オフィスドックカレッジ：{settings.SYSTEM_YOUTUBE_URL} <br>
        -------- <br>
        </p>
        """
        message_with_footer = message + footer_html

        send_mail(
            subject=subject,
            message="",
            from_email=f"{self.name_sender} <{self.from_email}>",
            recipient_list=recipient_list,
            html_message=message_with_footer,
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
                <p>{user_name}様 <br>
                いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。 <br>
                二要素認証コードをお知らせします。</p>
                <p>■確認コード：<b>{otp_code}</b> <br>
                ※この確認コードの有効期限は{int(OTP_TOKEN_MINUTES_EXPIRATION)}分間です。
                </p>
        """

        self.send(subject, message, [recipient])

    def send_system_forgot_password(
        self, user_name, recipient, token, is_admin
    ):
        """
        Send a forgot password email for system.
        """

        # FIXME: Replace email template later

        url = (
            f"{settings.ADMIN_WEBAPP_URL}/reset-password/?token={token}"
            if is_admin
            else f"{settings.SYSTEM_WEBAPP_URL}/reset-password/?token={token}"
        )
        subject = f"【{self.SYSTEM_NAME}】パスワード再設定のご案内"
        message = f"""
            <p>{user_name}様 <br>
            いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。 <br>
            以下の URL より、パスワードの再設定を行ってください。</p>
            <p>▼パスワード再設定用 URL<br>
            <a href="{url}">{url}</a> <br>
            ※この URL の有効期限は {int(DEFAULT_TOKEN_HOURS_EXPIRATION)}時間です。</p>
        """

        self.send(subject, message, [recipient])

    def send_system_invite_user_by_id(
        self, recipient, username, password, company_name
    ):
        """
        Send an invited user email.
        """

        # FIXME: Replace email template later

        subject = f"【{self.SYSTEM_NAME}】{username}さんを{company_name}に招待しました。"
        message = f"""
            <p>{username} さんを {company_name} に招待しました。下記がアカウント情報となります。</p>
            <p>■アカウント情報<br>
                ログイン ID：{username}<br>
                初期パスワード：{password} <br>
                ログイン URL：{settings.SYSTEM_WEBAPP_URL}
            </p>
        """

        self.send(subject, message, [recipient])

    def send_system_invite_user_by_email(
        self, recipient, password, company_name, invite_by, user_name
    ):
        """
        Send an invited user email.
        """

        # FIXME: Replace email template later

        subject = f"【{self.SYSTEM_NAME}】{invite_by}さんより{company_name}に招待されました"
        message = f"""
            <p>{user_name}様<p>
            <p>{invite_by}さんより、{company_name}に招待されました。 <br>
            以下のアカウント情報を使用してログインし、サービスをご利用ください。
            <p>
            <p>■アカウント情報<br>
                メールアドレス：{recipient}<br>
                初期パスワード：{password} <br>
                ログイン URL： {settings.SYSTEM_WEBAPP_URL}
            </p>
            <p>今後とも{self.SYSTEM_NAME}をどうぞよろしくお願い申し上げます。</p>
        """

        self.send(subject, message, [recipient])

    def send_admin_invite_user(self, recipient, password, user, invited_by):
        """
        Send an invited user email.
        """

        # FIXME: Replace email template later

        subject = f"【{self.SYSTEM_NAME}管理システム】{invited_by}さんより招待されました"

        message = f"""
            <p>{invited_by}さんより OFFICE DOCK 管理システムに招待されました。<br>
            以下のアカウント情報を使用してログインし、管理機能をご利用ください。
            <p>
            <p>■アカウント情報<br>
                メールアドレス：{recipient}<br>
                初期パスワード： {password} <br>
                ログイン URL： {settings.ADMIN_WEBAPP_URL}
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
        subject = f"【{self.SYSTEM_NAME}】アカウント発行完了のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>この度は{self.SYSTEM_NAME}にお申し込みいただき、誠にありがとうございます。<br>
            アカウントの発行が完了しましたので、下記の内容をご確認ください。</p>
            <p>
                ■ ログイン情報<br>
                ログインID： {user_email}<br>
                初期パスワード： {password}<br>
                ログインURL： <a href="{settings.SYSTEM_WEBAPP_URL}">{settings.SYSTEM_WEBAPP_URL}</a>
            </p>
            <p>初回ログイン時には、セキュリティ保護のためパスワードの変更をお願いいたします。</p>
            <p>今後とも{self.SYSTEM_NAME}をよろしくお願い申し上げます。</p>
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
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。<br>
            貴社のアカウントに新しいユーザーが追加されましたので、以下の通りお知らせいたします。</p>
            <p>
                ■ 追加ユーザー情報<br>
                氏名： {new_user_name}<br>
                ログインID： {new_user_email}
            </p>
            <p>追加されたユーザー様には別途、ログイン情報が通知されます。<br>
            アカウントの管理は、ユーザー管理画面よりご確認いただけます。</p>
            <p>今後とも{self.SYSTEM_NAME}をどうぞよろしくお願い申し上げます。</p>
        """
        self.send(subject, message, [recipient])

    def send_account_restored(self, recipient, company_name, responsible_name):
        """
        Notification email when an account is restored
        """
        subject = f"【{self.SYSTEM_NAME}】アカウント復元とサービス利用再開のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>アカウントの復元手続きが完了し、本日よりサービスのご利用を再開いただけるようになりましたのでお知らせいたします。<br>
            なお、ご利用料金の請求は翌月 1 日より再開いたします。 <br>
            （今月分のご利用料金は発生いたしません）
            </p>
            <p>引き続き{self.SYSTEM_NAME}をご愛顧賜りますよう、よろしくお願い申し上げます。</p>

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
            <p>今後とも{self.SYSTEM_NAME}をよろしくお願い申し上げます。</p>
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
        subject = f"【{self.SYSTEM_NAME}】ご利用プラン自動アップグレードのお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>ご利用アカウント数の増加に伴い、貴社のご契約プランが以下の通り自動的にアップグレードされましたのでお知らせいたします。</p>
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
            <p>{start_month} のご利用分より、新しいプラン料金が適用されます。</p>
            <p>今後とも{self.SYSTEM_NAME}をどうぞよろしくお願い申し上げます。</p>
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
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>ご契約いただいております{self.SYSTEM_NAME}の契約更新時期が近づいてまいりました。<br>
            つきましては、下記の内容にて 自動的に 1 年間の契約更新 が行われますことをお知らせいたします。
            </p>
            <p>
                ■ 更新内容<br>
                契約更新日： {renewal_date}<br>
                更新後プラン： {plan}<br>
                更新後料金： {price} 円/月（税込）
            </p>
            <p>今後とも{self.SYSTEM_NAME}をどうぞよろしくお願い申し上げます。</p>
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
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>{usage_month}分のご利用料金につきまして、決済手続きが正常に完了いたしましたのでお知らせいたします。</p>
            <p>
                ■決済内容 <br>
                決済日： {billing_date}<br>
                ご請求金額： {amount} 円（税込）<br>
                対象期間： {period}
            </p>
            <p>今後とも{self.SYSTEM_NAME}をどうぞよろしくお願い申し上げます。</p>
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
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>
                {usage_month}分のご利用料金につきまして、ご登録のお支払い方法による決済が正常に完了いたしませんでした。<br>
                現在もサービスは継続してご利用いただけますが、お支払い情報に不備がある可能性がございます。
            </p>
            <p>お手数をおかけいたしますが、下記よりお支払い情報のご確認・ご変更をお願いいたします。</p>
            <p>
                ▼お支払い方法の確認・変更はこちら<br>
                <a href="{settings.SYSTEM_WEBAPP_URL}/{payment_url}">{settings.SYSTEM_WEBAPP_URL}/{payment_url}</a>
            </p>
            <p>本メール送信後、システムにより自動的に決済の再試行（リトライ）が行われます。<br>
            リトライ期間中にお支払いが確認できない場合、サービスが一時的に停止される場合がございますので、お早めのご対応をお願いいたします。
            </p>
            <p>ご不明な点がございましたら、下記サポートチームまでお問い合わせください。</p>
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
        subject = f"【{self.SYSTEM_NAME}】サービス一時停止のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>{usage_month}分のご利用料金につきまして、これまで複数回にわたり決済の再試行を行いましたが、お支払いの確認が取れませんでした。 <br>
            そのため誠に恐縮ではございますが、本日より貴社の OFFICE DOCK サービスを一時的に停止させていただいております。
            </p>
            <p>
                ■サービス再開方法  <br>
                下記 URL よりログインのうえ、未払い料金のお支払い手続きをお願いいたします。 <br>
                決済の確認が取れ次第、サービスは自動的に再開されます。 <br>
            </p>
            <p>
                ▼お支払い手続きはこちら<br>
                <a href="{settings.SYSTEM_WEBAPP_URL}/{payment_url}">{settings.SYSTEM_WEBAPP_URL}/{payment_url}</a>
            </p>
            <p>ご不明な点やお困りのことがございましたら、下記サポートチームまでお問い合わせください。</p>
        """
        self.send(subject, message, [recipient])

    def send_service_restored(self, recipient, company_name, responsible_name):
        """
        Notification email when service is restored after payment succeeds
        """
        subject = f"【{self.SYSTEM_NAME}】サービス利用再開のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>お支払い情報の更新および未払い料金の決済を確認いたしました。<br>
            これに伴い、一時停止しておりましたサービスのご利用を本日より再開いたしましたのでお知らせいたします。
            </p>
            <p>この度はお手続きをいただき、誠にありがとうございました。</p>
            <p>今後とも{self.SYSTEM_NAME}をどうぞよろしくお願い申し上げます。</p>
        """
        self.send(subject, message, [recipient])

    def send_contract_cancellation_request(
        self, recipient, company_name, responsible_name, end_date
    ):
        """
        Notification email when a contract cancellation request is received
        """
        subject = f"【{self.SYSTEM_NAME}】解約予約受付のお知らせ"
        message = f"""
            <p>{company_name}<br>{responsible_name} 様</p>
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>この度、{self.SYSTEM_NAME}の解約予約手続きを承りました。<br>
            ご契約の最終利用日（契約終了日）は、以下の通りとなります。
            </p>
            <p>
                ■契約終了日 <br>
                {end_date}
            </p>
            <p>契約終了日までは、引き続きサービスをご利用いただけます。</p>
            <p>これまで{self.SYSTEM_NAME}をご利用いただき、心より御礼申し上げます。<br>
            またのご利用をスタッフ一同お待ちしております。
            </p>
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
            <p>いつも{self.SYSTEM_NAME}をご利用いただき、誠にありがとうございます。</p>
            <p>{end_date} をもちまして、{self.SYSTEM_NAME}のご契約が満了し、解約手続きが完了いたしましたのでお知らせいたします。 <br>
            これに伴い、貴社のアカウントは本日よりご利用いただけなくなります。
            </p>
            <p>
            ■データの取り扱いについて <br>
            解約後のデータは、{end_date} から 2 ヶ月間保持されます。<br>
            保持期間を過ぎますと、セキュリティ保護のため全データが完全に削除されます。
            </p>
            <p>
            これまで{self.SYSTEM_NAME}をご利用いただき、心より御礼申し上げます。 <br>
            またのご利用をスタッフ一同お待ちしております。
            </p>
        """
        self.send(subject, message, [recipient])
