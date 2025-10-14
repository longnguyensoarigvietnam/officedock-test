from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
import stripe

from base.apis import BaseAPIViewSet
from base.permissions import ActionPermission, IsCronJob
from calendars.constants import (
    ScheduleTypes,
    CalendarTypes,
)
from calendars.models import Schedule
from chat.constants import WebSocketEventType
from common.constants import (
    RETRY_PAYMENT_MAX,
    SYSTEM_PAYMENT_ENDPOINT,
    THE_FIRST_RETRY_FAILED,
    THE_LAST_RETRY_FAILED,
    InvoiceStatus,
    SubscriptionStatus,
)
from common.helpers import (
    get_all_organizations,
    get_balances_of_user,
    get_company_status,
    get_data_organization_my_statistic,
    get_data_organization_team_statistic,
    get_event_locations,
    get_filter_organization_categories,
    get_is_have_mvp_vote,
    get_items_of_user,
    get_members,
    get_organization_skills,
    get_organization_with_categories,
    get_organization_with_users,
    get_organizations_for_all_team_statistic,
    get_organizations_of_user_by_screen_role,
    get_plans,
    get_roles,
    get_statistic_categories,
    get_tags,
    get_task_status,
    get_unanswered_count,
    get_user_setting,
)
from common.services.cronjon_service import CronJobService
from common.services.stripe_service import StripeService
from companies.constants import (
    CompanyStatus,
    CompanyTransactionTypes,
    Department,
    Industry,
    SystemMainPurpose,
    TransactionStatus,
)
from companies.serializers import CompanySerializer
from companies.services import CompanyService
from dashboard.utils import separate_duration_while_keep_running
from mvp_votes.constants import DEFAULT_CONTENT_TWEET_END_VOTE, MVPVoteTypes
from mvp_votes.models import MVPVoteManagement
from skills.models import SkillMapSkillLevel
from surveys.constants import DEFAULT_CONTENT_TWEET_END_SURVEY
from surveys.models import Survey

from tweets.models import Tweet
from users.models import User, UserBalance
from users.constants import RoleTypes
from tasks.models import Task, TaskDuration
from tasks.constants import (
    TaskTypes,
)
from roles.constants import Actions, Screens
from chat.models import ChatRoom
from companies.models import (
    Company,
    CompanyPaymentMethod,
    CompanyPlan,
    CompanyTransaction,
)
from base.messages import ERROR_MESSAGES
from common.services.transaction_service import TransactionService
from common.services.cleanup_data_service import CleanupDataService
from utils.mail import PaymentMailService
from .serializers import (
    CreationDataOrganizationSerializer,
    CreationDataTaskListSerializer,
)
from .utils import (
    check_task_overtime,
    format_date,
    send_web_socket_event,
    to_camel_case,
    to_datetime,
    to_snake_case,
    validate_company_organization,
)
from base.filters import FilterByPermission


@extend_schema(tags=["System > Creation Data"])
class SystemCreationDataViewSet(BaseAPIViewSet):
    """
    API endpoint for CreationData.
    """

    filter_backends = [FilterByPermission]
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        """
        Filter data by current screen
        """
        screen_name = self.request.query_params.get("screen_name")
        defined_screens = [to_camel_case(item.value) for item in Screens]
        if screen_name and to_camel_case(screen_name) in defined_screens:
            self.screen_name = to_snake_case(screen_name)
            return [ActionPermission()]
        return super().get_permissions()

    @extend_schema(
        parameters=[
            OpenApiParameter("screen_name", type=str),
            OpenApiParameter("organization_id", type=int),
            OpenApiParameter("user_id", type=int),
            OpenApiParameter("get_roles", type=bool),
            OpenApiParameter("get_all_members", type=bool),
            OpenApiParameter("get_all_organizations", type=bool),
            OpenApiParameter("get_organization_members", type=bool),
            OpenApiParameter("get_tags", type=bool),
            OpenApiParameter("get_tags_of_organization", type=bool),
            OpenApiParameter("get_task_status", type=bool),
            OpenApiParameter("get_event_types", type=bool),
            OpenApiParameter("get_event_locations", type=bool),
            OpenApiParameter("get_organization_skills", type=bool),
            OpenApiParameter("get_statistic_categories", type=bool),
            OpenApiParameter("is_organization_calendar", type=bool),
            OpenApiParameter("get_organizations_of_user_by_screen", type=str),
            OpenApiParameter("get_organization_with_categories", type=bool),
            OpenApiParameter("get_organization_for_team_statistic", type=bool),
            OpenApiParameter("get_user_setting", type=bool),
            OpenApiParameter("get_filter_organization_categories", type=bool),
            OpenApiParameter("get_organization_with_users", type=bool),
            OpenApiParameter("get_organization_for_my_statistic", type=bool),
            OpenApiParameter("get_company", type=bool),
            OpenApiParameter("get_items_of_user", type=bool),
            OpenApiParameter("get_balances_of_user", type=bool),
            OpenApiParameter("get_unanswered_count_of_survey", type=bool),
            OpenApiParameter("get_current_mvp_vote", type=bool),
            OpenApiParameter(
                "get_organizations_for_all_team_statistic", type=bool
            ),
            OpenApiParameter("get_company_status", type=bool),
            OpenApiParameter("get_plans", type=bool),
        ]
    )
    @action(methods=["GET"], detail=False, url_path="common")
    def common_data(self, request):
        """
        Handle and response data base on query params
        """
        user = request.user
        company = user.company
        organization_id = request.query_params.get("organization_id")
        organization = None
        if organization_id:
            organization = validate_company_organization(
                company, organization_id
            )

        if "is_organization_calendar" in request.query_params:
            organization = company.get_calendar_organization()
        user_id = request.query_params.get("user_id")
        if user_id:
            user = get_object_or_404(User, id=user_id)
        response_data = {}
        organizations = None
        if "get_company" in request.query_params:
            response_data["company"] = CompanySerializer(company).data
        if "get_all_organizations" in request.query_params:
            organizations = get_all_organizations(company, organizations)

            # Filter oganization by permission with imput screen_name in params
            filtered_organizations = self.filter_queryset(organizations)

            response_data[
                "all_organizations"
            ] = CreationDataOrganizationSerializer(
                filtered_organizations, many=True
            ).data
        if "get_roles" in request.query_params:
            response_data["roles"] = get_roles(company)
        if "get_all_members" in request.query_params:
            response_data["all_members"] = get_members(company)
        if "get_organization_members" in request.query_params:
            response_data["organization_members"] = get_members(
                company, organization
            )
        if "get_tags" in request.query_params:
            response_data["tags"] = get_tags(company, organization)
        if "get_task_status" in request.query_params:
            response_data["task_status"] = get_task_status()
        if "get_event_types" in request.query_params:
            response_data["event_types"] = [
                item.value for item in ScheduleTypes
            ]
        if "get_event_locations" in request.query_params:
            response_data["event_locations"] = get_event_locations(company)
        if "get_organization_skills" in request.query_params:
            if not organizations:
                organizations = get_all_organizations(company, organizations)
            response_data["organization_skills"] = get_organization_skills(
                organizations, organization
            )
        if "get_statistic_categories" in request.query_params:
            response_data["statistic_categories"] = get_statistic_categories(
                company
            )
        if (
            "get_organizations_of_user_by_screen" in request.query_params
            and to_snake_case(
                request.query_params.get("get_organizations_of_user_by_screen")
            )
            in Screens.values()
        ):
            screen_name = to_snake_case(
                request.query_params.get("get_organizations_of_user_by_screen")
            )
            action = Actions.ADD.value
            response_data[
                "organizations"
            ] = get_organizations_of_user_by_screen_role(
                user, screen_name, action
            )
        if "get_organization_with_categories" in request.query_params:
            if not organizations:
                organizations = get_all_organizations(company, organizations)
            filtered_organizations = organizations.filter(users=user)
            response_data[
                "organization_categories"
            ] = get_organization_with_categories(
                filtered_organizations, organization, user
            )
        if "get_organization_for_team_statistic" in request.query_params:
            response_data[
                "organization_statistics"
            ] = get_data_organization_team_statistic(
                user, company, organization
            )
        if "get_organization_for_my_statistic" in request.query_params:
            if not organizations:
                organizations = get_all_organizations(company, organizations)
            response_data["my_statistics"] = get_data_organization_my_statistic(
                user, organizations, company
            )
        if "get_user_setting" in request.query_params:
            response_data["user_setting"] = get_user_setting(user)
        if "get_filter_organization_categories" in request.query_params:
            if not organizations:
                organizations = get_all_organizations(company, organizations)
            filtered_organizations = (
                organizations.filter(Q(users=user) | Q(id=organization))
                .order_by("-created_at")
                .all()
            )
            response_data[
                "filter_organizations_categories"
            ] = get_filter_organization_categories(filtered_organizations)
            response_data["user_setting"] = get_user_setting(user)
        if "get_organization_with_users" in request.query_params:
            if not organizations:
                organizations = get_all_organizations(company, organizations)
            filtered_organizations = organizations.filter(users=user)
            response_data["organization_users"] = get_organization_with_users(
                filtered_organizations
            )
        if "get_items_of_user" in request.query_params:
            response_data["items_of_user"] = get_items_of_user(user)
        if "get_balances_of_user" in request.query_params:
            response_data["balances_of_user"] = get_balances_of_user(user)
        if "get_unanswered_count_of_survey" in request.query_params:
            response_data["unanswered_count"] = get_unanswered_count(user)
        if "get_current_mvp_vote" in request.query_params:
            response_data["is_has_mvp_voting"] = get_is_have_mvp_vote(company)
        if "get_organizations_for_all_team_statistic" in request.query_params:
            response_data[
                "organizations_of_all_team_statistic"
            ] = get_organizations_for_all_team_statistic(user)
        if "get_company_status" in request.query_params:
            response_data["company_status"] = get_company_status()
        if "get_plans" in request.query_params:
            response_data["plans"] = get_plans()

        return self.response_ok(response_data)

    @extend_schema(
        parameters=[
            OpenApiParameter("page_size", type=int, required=False),
            OpenApiParameter("page", type=int, required=False),
            OpenApiParameter("search", type=str, required=False),
            OpenApiParameter("user_ids", type=str, required=False),
            OpenApiParameter("chat_room_code", type=str, required=False),
        ],
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="tasks",
        serializer_class=CreationDataTaskListSerializer,
    )
    def task_list_options(self, request):
        """
        Get task list of the option
        """

        tasks = (
            Task.objects.filter(deleted_at__isnull=True)
            .exclude(type=TaskTypes.MY_TEMPLATE.value)
            .order_by("-created_at")
        )

        # Get list of tasks by room code
        if chat_room_code := request.query_params.get("chat_room_code"):
            chat_room = ChatRoom.objects.filter(code=chat_room_code).first()
            if chat_room and (
                ids := chat_room.participants.values_list("id", flat=True)
            ):
                tasks = tasks.filter(
                    Q(people_in_charge__id__in=ids) | Q(created_by_id__in=ids)
                )

        # Get list of tasks by user ids
        elif user_ids := request.query_params.get("user_ids"):
            ids = []
            for id in user_ids.split(","):
                try:
                    ids.append(int(id))
                except ValueError:
                    continue
            if ids:
                tasks = tasks.filter(
                    Q(people_in_charge__id__in=ids) | Q(created_by_id__in=ids)
                )

        # Get list of tasks by user logged in
        else:
            user_logged = request.user
            tasks = tasks.filter(
                Q(people_in_charge=user_logged) | Q(created_by=user_logged)
            )

        # Filter input keyword
        if search_query := request.query_params.get("search"):
            tasks = tasks.filter(title__icontains=search_query)

        return self.response_pagination(
            request, tasks.distinct(), CreationDataTaskListSerializer
        )


@extend_schema(tags=["System > Cron Job"])
class CronJobViewSet(BaseAPIViewSet):
    """API endpoint of Cron job viewset"""

    permission_classes = [AllowAny, IsCronJob]

    def __init__(self, *args, **kwargs):
        """
        Initialize the Company service
        """
        super().__init__(*args, **kwargs)
        self.cronjob_service = CronJobService()

    @extend_schema(
        parameters=[OpenApiParameter("cronjob_key", type=str, required=True)],
    )
    @action(methods=["POST"], detail=False, url_path="run-every-minute")
    @transaction.atomic
    def cronjob_run_every_minute(self, request):
        """
        Run per-minute maintenance/notification cron tasks.

        Responsibilities:
        - Finalize MVP votes that have ended:
          - Mark `PRESENT` votes with `end_date < now()` as `PAST`
          - Reward winners and create a system tweet
        - Announce surveys that ended within the last minute:
          - Bulk-create system tweets per survey
        - Check Skill Map level progression popups:
          - If a level meets look-back or measure thresholds, emit a websocket event to the staff user
        - Split cross-day running task durations:
          - For durations still running from a previous day, split while keeping the current one running
        - Send task reminders:
          - For tasks with `remind_at <= now < deadline`, emit a websocket reminder event to each PIC
        - Warn for task/schedule durations overtime:
          - For running durations started today, detect overtime and emit warning websocket events
            to all relevant users (task PICs or schedule participants)
        """
        now_time = now()

        # --- 1. Check MVP vote ended ---
        mvp_votes = MVPVoteManagement.objects.filter(
            end_date__lt=now_time, type=MVPVoteTypes.PRESENT.value
        ).select_related("company")
        if mvp_votes.exists():
            transaction_service = TransactionService()
            for mvp_vote in mvp_votes:
                mvp_vote.type = MVPVoteTypes.PAST.value
                mvp_vote.save(update_fields=["type"])

                # Handle add coin for users with most votes
                transaction_service.reward_mvp_vote_winners(mvp_vote)

                Tweet.objects.create(
                    company_id=mvp_vote.company_id,
                    is_system=True,
                    content=DEFAULT_CONTENT_TWEET_END_VOTE,
                )

        # --- 2. Check Survey ended in the last 1 minute ---
        one_minute_ago = now_time - timedelta(minutes=1)
        surveys = Survey.objects.filter(
            end_at__lt=now_time, end_at__gte=one_minute_ago
        )
        Tweet.objects.bulk_create(
            [
                Tweet(
                    company_id=survey.company_id,
                    is_system=True,
                    content=DEFAULT_CONTENT_TWEET_END_SURVEY,
                )
                for survey in surveys
            ]
        )

        # --- 3. Check Skill Map Levels ---
        skill_map_levels = SkillMapSkillLevel.objects.filter(
            skill_map__is_valid=True, popup=True, is_complete=False
        ).select_related("skill", "skill_map", "skill_map__staff")
        for skill_map_level in skill_map_levels:
            data = self._check_process_skill_map_level(skill_map_level)
            if data:
                send_web_socket_event(
                    data, user=skill_map_level.skill_map.staff
                )

        # --- 4. Separate Task Duration ---
        separate_task_durations = TaskDuration.objects.filter(
            Q(paused_at__isnull=True)
            & Q(Q(task__is_start=True) | Q(schedule__is_start=True))
            & Q(started_at__date__lt=now_time.date())
        ).select_related("user")
        for duration in separate_task_durations:
            separate_duration_while_keep_running(
                duration, now_time, user=duration.user
            )

        # --- 5. Remind Tasks ---
        tasks = Task.objects.filter(
            remind_at__lte=now_time, deadline__gt=now_time
        ).prefetch_related("people_in_charge_tasks")
        for task in tasks:
            if task.deadline and task.remind_at:
                reminds = task.reminds
                for user in task.people_in_charge_tasks.all():
                    send_web_socket_event(
                        {
                            "id": task.id,
                            "title": task.title,
                            "remind_countdown": reminds["countdown"],
                            "remind_type": reminds["type"],
                            "action": WebSocketEventType.REMIND_TASK.value,
                        },
                        user=user,
                    )

        # --- 6. Check Task Durations overtime ---
        start_of_today = datetime.combine(now_time.date(), time.min)
        task_durations = TaskDuration.objects.filter(
            started_at__gte=start_of_today, paused_at__isnull=True
        ).select_related("task", "schedule")
        for task_duration in task_durations:
            users = []
            related_obj = (
                task_duration.task
                if task_duration.task
                else task_duration.schedule
            )
            if isinstance(related_obj, Task):
                users = related_obj.people_in_charge.all()
            elif (
                isinstance(related_obj, Schedule)
                and task_duration.is_cancel_alert is False
            ):
                users = related_obj.participants.all()

            is_send_sk, is_over_estimate = check_task_overtime(
                related_obj, task_duration, timedelta(minutes=35)
            )

            if is_send_sk:
                for user in users:
                    send_web_socket_event(
                        {
                            "id": (
                                task_duration.task.id
                                if isinstance(related_obj, Task)
                                else task_duration.schedule.id
                            ),
                            "task_duration_running_uuid": str(
                                task_duration.uuid
                            ),
                            "is_over_estimate": is_over_estimate,
                            "action": WebSocketEventType.DURATION_OVERTIME_WARNING.value,
                            "type": (
                                CalendarTypes.TASK.value
                                if isinstance(related_obj, Task)
                                else CalendarTypes.SCHEDULE.value
                            ),
                        },
                        user=user,
                    )

        return self.response_ok()

    def _check_process_skill_map_level(self, skill_map_level):
        """
        Handle check skill map level and response data socket
        """
        data = {
            "skill": {
                "id": skill_map_level.skill.id,
                "name": skill_map_level.skill.name,
            },
            "skill_map": skill_map_level.skill_map_id,
            "skill_map_level": skill_map_level.id,
            "measure_count": None,
            "measure_time": None,
            "look_back_interval": None,
            "look_back_type": None,
            "action": WebSocketEventType.SKILL_LEVEL_UP_COMPLETED.value,
        }
        if (
            skill_map_level.next_submit_at
            and skill_map_level.next_submit_at <= now()
        ):
            data["look_back_interval"] = skill_map_level.look_back_interval
            data["look_back_type"] = skill_map_level.look_back_type
            return data
        if skill_map_level.measure_time:
            hours, _, _ = map(
                int, skill_map_level.actual_measure_time.split(":")
            )
            if skill_map_level.measure_time <= hours:
                data["measure_time"] = skill_map_level.measure_time
                return data
        if (
            skill_map_level.measure_count
            and skill_map_level.measure_count
            <= skill_map_level.actual_measure_count
        ):
            data["measure_count"] = skill_map_level.measure_count
            return data

        return False

    @extend_schema(
        parameters=[
            OpenApiParameter("cronjob_key", type=str, required=True),
        ]
    )
    @action(
        methods=["POST"],
        detail=False,
        url_path="run-every-hour",
    )
    @transaction.atomic
    def cronjob_run_every_hour(self, request):
        # TODO: Implement logic cronjob run every hour
        return self.response_ok()

    @extend_schema(
        parameters=[
            OpenApiParameter("cronjob_key", type=str, required=True),
        ]
    )
    @action(
        methods=["POST"],
        detail=False,
        url_path="run-every-day",
    )
    @transaction.atomic
    def cronjob_run_every_day(self, request):
        """
        Daily cronjob endpoint.
        - Clean up companies whose contracts ended after the 2-month retention period
        - Clean up soft-deleted thanks messages after retention period
        - Handle company closing and deadline logic
        - Reward users with coins/pearls based on activities
        """

        today = now().date()
        cleanup_data_service = CleanupDataService()

        # 1. Cleanup data
        # Cleanup companies whose contracts ended after the 2-month retention period
        deleted_company_contract_count = (
            cleanup_data_service.cleanup_data_company_contracts(today)
        )
        # Cleanup soft-deleted thanks messages after retention period
        deleted_tks_msg_count = (
            cleanup_data_service.cleanup_data_thanks_messages(today)
        )

        # 2. Iterate over all companies to handle closing logic
        self.cronjob_service.iterate_over_all_companies_to_closing(today)

        # 3. Send mail notify renewal contract
        if today.day == 1:
            self.cronjob_service.handle_send_email_renewal_company_contract(
                today
            )
            self.cronjob_service.handle_downgrade_plan_after_renewal_contract(
                today
            )

        # 4. Get company have status Temporary Usage and void the invoice before auto pay
        if today.day == 5:
            self.cronjob_service.handle_cancel_the_invoice_of_company_temporary_usage(
                today
            )

        return self.response_ok(
            {
                "today": today.isoformat(),
                "deleted_tks_msg_count": deleted_tks_msg_count,
                "deleted_company_contract_count": deleted_company_contract_count,
            }
        )


@extend_schema(tags=["System > Webhook"])
class WebhookView(BaseAPIViewSet):
    """
    Webhook endpoint for receiving and handling events from Stripe.
    """

    authentication_classes = []  # Webhooks are usually unauthenticated
    permission_classes = [AllowAny]

    def __init__(self, *args, **kwargs):
        """
        Initialize the services
        """
        super().__init__(*args, **kwargs)
        self.stripe_service = StripeService()
        self.company_service = CompanyService()
        self.mail_service = PaymentMailService()

    @action(methods=["POST"], url_path="stripe", detail=False)
    def received_webhook(self, request, pk=None):
        """
        Entry point for Stripe webhooks.
        - Verifies the Stripe signature.
        - Delegates event handling to appropriate service methods.
        """
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

        try:
            # Verify webhook signature to ensure authenticity
            event = stripe.Webhook.construct_event(
                payload,
                sig_header,
                settings.STRIPE_WEBHOOK_KEY,
            )
        except ValueError as e:
            # Invalid payload
            print({"Webhook Error": f"Invalid payload: {e}"})
            raise ValidationError({"detail": f"Invalid payload: {e}"})
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            print({"Webhook Error": f"Invalid signature: {e}"})
            raise ValidationError({"detail": f"Invalid signature: {e}"})

        print(f"Event type: {event.type}")
        # Route events to appropriate handlers
        if event.type == "invoice.created":
            invoice = event.data.object
            self.stripe_service.handle_invoice_created(invoice)
            # Check renewal of contract and handle it
            invoice_start_date = datetime.fromtimestamp(invoice.created)
            company = Company.objects.filter(
                stripe_customer_id=invoice.customer,
                contract__next_renewal_at__lte=invoice_start_date,
                status__in=[
                    CompanyStatus.ACTIVE_CONTRACT.value,
                    CompanyStatus.TEMPORARY_USAGE.value,
                ],
            ).first()
            if company:
                self.company_service.handle_contract_renewal(
                    company, invoice_start_date.date()
                )
        elif event.type in ["invoice.payment_succeeded"]:
            # Update status transaction
            self.handle_payment_succeeded(event.data.object)
        elif event.type == "invoice.payment_failed":
            # Update status transaction and send mail
            self.handle_payment_failed(event.data.object)
        elif event.type == "invoice.finalized":
            # Handle pay invoice and void it when company have status Temporary Usage
            self.stripe_service.handle_pay_invoice(event.data.object)
        elif event.type == "customer.subscription.deleted":
            subscription = event.data.object
            self.handle_subscription_deleted(subscription)
        elif event.type == "invoice.updated":
            self.handle_update_the_last_invoice(event.data.object)
        elif event.type in [
            "payment_intent.payment_failed",
            "payment_intent.succeeded",
        ]:
            self.handle_status_retry_failed_of_payment_method(event.data.object)
        else:
            print(f"Unhandled event type: {event.type}")

        return self.response_ok({"status": "success"})

    def handle_payment_succeeded(self, invoice):
        """
        Handle successful invoice payment.
        - Example: update subscription status, log event, notify user, etc.
        """
        company_transaction = CompanyTransaction.objects.filter(
            stripe_invoice_id=invoice.id
        ).first()
        company = Company.objects.filter(
            stripe_customer_id=invoice.customer
        ).first()
        if not company or not company_transaction:
            print(f"❌ Cannot find company of customer {invoice.customer}")
            return
        line = invoice.lines.data[0]
        period_start = to_datetime(line.period.start)
        period_end = to_datetime(line.period.end)
        paid_at = to_datetime(invoice.status_transitions.paid_at)
        period = f"{format_date(period_start, style='jp_date')} 〜 {format_date(period_end, style='jp_date')}"
        self.mail_service.send_monthly_payment_success(
            recipient=company.responsible_person_mail,
            company_name=company.name,
            responsible_name=company.responsible_person_name,
            usage_month=format_date(
                company_transaction.invoice_target, style="jp_month_year"
            ),
            billing_date=format_date(paid_at, style="jp_date"),
            amount=format(invoice.amount_paid, ","),
            period=period,
        )
        # Update transaction status
        company_transaction.status = TransactionStatus.PAID.value
        company_transaction.paid_at = paid_at
        company_transaction.save(update_fields=["status", "paid_at"])
        self.company_service.process_company_status_after_successful_payment(
            company, invoice, period_start
        )
        print(f"✅ Payment succeeded for invoice {invoice.id}")

    def handle_payment_failed(self, invoice):
        """
        Handle failed invoice payment.
        - Example: notify user, retry payment, disable service, etc.
        """
        print(f"❌ Payment failed for invoice {invoice.id}")
        attempt_count = invoice.attempt_count
        line = invoice.lines.data[0]
        period_start = to_datetime(line.period.start)
        company = Company.objects.filter(
            stripe_customer_id=invoice.customer
        ).first()
        if attempt_count == THE_FIRST_RETRY_FAILED:
            payment_methods = company.payment_methods
            next_pm = payment_methods.filter(is_retry_failed=False).first()
            # Retry if have another card
            if next_pm:
                self.stripe_service.handle_pay_invoice(
                    invoice, next_pm.stripe_payment_method_id
                )
            else:
                # Send email when all cards failed
                self.mail_service.send_payment_failed_first(
                    recipient=company.responsible_person_mail,
                    company_name=company.name,
                    responsible_name=company.responsible_person_name,
                    usage_month=format_date(
                        period_start, style="jp_month_year"
                    ),
                    payment_url=SYSTEM_PAYMENT_ENDPOINT,
                )
        if attempt_count == THE_LAST_RETRY_FAILED:
            self.mail_service.send_payment_failed_final(
                recipient=company.responsible_person_mail,
                company_name=company.name,
                responsible_name=company.responsible_person_name,
                usage_month=format_date(period_start, style="jp_month_year"),
                payment_url=SYSTEM_PAYMENT_ENDPOINT,
            )
        if company.status != CompanyStatus.SUSPENDED.value and (
            attempt_count == THE_FIRST_RETRY_FAILED
            or attempt_count == THE_LAST_RETRY_FAILED
        ):
            # Update company status
            self.company_service.change_status_of_company(
                company,
                (
                    CompanyStatus.SUSPENDED.value
                    if attempt_count > RETRY_PAYMENT_MAX
                    else CompanyStatus.RETRY_PAYMENT.value
                ),
            )

        # Update transaction status
        CompanyTransaction.objects.filter(stripe_invoice_id=invoice.id).update(
            status=TransactionStatus.PAYMENT_FAILED.value,
            retry_attempt=attempt_count,
        )

    def handle_subscription_deleted(self, subscription):
        company = Company.objects.filter(
            stripe_customer_id=subscription.customer
        ).first()
        # After description deleted, the last invoice cannot auto pay, so need reset invoice finalize_at
        if company:
            # Get invoice
            transaction = company.transactions.filter(
                type=CompanyTransactionTypes.INVOICE.value,
                status=TransactionStatus.UNPAID.value,
                paid_at__isnull=True,
            ).last()
            if transaction:
                invoice = stripe.Invoice.retrieve(transaction.stripe_invoice_id)
                # Set the finalize of invoice
                self.stripe_service.update_invoice_finalize(invoice, company)

            print(f"✅ Company {company.id} cancel subscription")

    def handle_update_the_last_invoice(self, invoice):
        """
        Handle update the last invoice, make it finalize in the correct time before terminate contract of company
        """
        # Get invoice
        transaction = CompanyTransaction.objects.filter(
            type=CompanyTransactionTypes.INVOICE.value,
            status=TransactionStatus.UNPAID.value,
            paid_at__isnull=True,
            stripe_invoice_id=invoice.id,
        ).last()
        if not transaction:
            return
        company_plan = CompanyPlan.objects.filter(
            company=transaction.company
        ).first()
        subscription = self.stripe_service.retrieve_subscription(
            company_plan.stripe_subscription_id
        )
        if (
            transaction
            and invoice.status == InvoiceStatus.DRAFT.value
            and not invoice.automatically_finalizes_at
            and subscription.status == SubscriptionStatus.CANCELED.value
        ):
            invoice = stripe.Invoice.retrieve(transaction.stripe_invoice_id)
            # Get the company's default payment method
            company = Company.objects.filter(
                stripe_customer_id=invoice.customer
            ).first()
            # Set the finalize of invoice
            self.stripe_service.update_invoice_finalize(invoice, company)
            print(f"✅ Turn on automatic payment of last invoice ")

    def handle_status_retry_failed_of_payment_method(self, payment_intent):
        """Handle and update the retry failure status of a company's payment method based on a Stripe PaymentIntent."""
        if payment_intent.get(
            "last_payment_error"
        ) and payment_intent.last_payment_error.get("payment_method"):
            last_error_pm = payment_intent.last_payment_error.get(
                "payment_method"
            )
            CompanyPaymentMethod.objects.filter(
                stripe_payment_method_id=last_error_pm["id"]
            ).update(is_retry_failed=True)
        elif payment_intent.payment_method:
            CompanyPaymentMethod.objects.filter(
                stripe_payment_method_id=payment_intent.payment_method,
                is_retry_failed=True,
            ).update(is_retry_failed=False)


@extend_schema(tags=["Admin > Creation Data"])
class AdminCreationDataViewSet(BaseAPIViewSet):
    """
    API endpoint for Admin CreationData.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter("get_company_status", type=bool),
            OpenApiParameter("get_plans", type=bool),
            OpenApiParameter("get_department", type=bool),
            OpenApiParameter("get_system_main_purpose", type=bool),
            OpenApiParameter("get_industry", type=bool),
        ]
    )
    @action(methods=["GET"], detail=False, url_path="common")
    def common_data(self, request):
        """
        Handle and response data base on query params
        """
        response_data = {}
        if "get_company_status" in request.query_params:
            response_data["company_status"] = get_company_status()
        if "get_plans" in request.query_params:
            response_data["plans"] = get_plans()
        if "get_department" in request.query_params:
            response_data["department"] = Department.values()
        if "get_system_main_purpose" in request.query_params:
            response_data["system_main_purpose"] = SystemMainPurpose.values()
        if "get_industry" in request.query_params:
            response_data["industry"] = Industry.values()
        return self.response_ok(response_data)


@extend_schema(tags=["System > APIs testing "])
class TestingViewset(BaseAPIViewSet):
    """
    API endpoint for testing
    """

    permission_classes = [AllowAny]

    def __init__(self, *args, **kwargs):
        """
        Initialize the Company service
        """
        super().__init__(*args, **kwargs)
        self.cronjob_service = CronJobService()

    @extend_schema(
        parameters=[
            OpenApiParameter("company_id", type=int),
            OpenApiParameter("year", type=int),
            OpenApiParameter("month", type=int),
            OpenApiParameter("day", type=int),
        ]
    )
    @action(
        methods=["POST"],
        detail=False,
        url_path="fake-run-every-day",
    )
    @transaction.atomic
    def fake_cronjob_run_every_day(self, request):
        """
        Fake daily cronjob endpoint.
        - Handle company closing and deadline logic
        - Reward users with coins/pearls based on activities
        """

        if not settings.DEBUG:
            raise NotFound()

        # 1. Get params
        company_id = request.query_params.get("company_id")
        year = request.query_params.get("year")
        month = request.query_params.get("month")
        day = request.query_params.get("day")
        if year and month and day:
            today = date(int(year), int(month), int(day))
        else:
            today = now().date()

        if company_id:
            all_companies = Company.objects.filter(id=company_id)

        if not company_id or not all_companies.exists():
            raise ValidationError(
                {
                    "detail": ERROR_MESSAGES["company_not_exists"].format(
                        id=company_id
                    )
                }
            )

        cleanup_data_service = CleanupDataService()

        # 1. Cleanup data
        # Cleanup companies whose contracts ended after the 2-month retention period
        deleted_company_contract_count = (
            cleanup_data_service.cleanup_data_company_contracts(
                today, all_companies
            )
        )
        # Cleanup soft-deleted thanks messages after retention period
        deleted_tks_msg_count = (
            cleanup_data_service.cleanup_data_thanks_messages(
                today, all_companies
            )
        )

        # 2. Iterate over all companies to handle closing logic
        self.cronjob_service.iterate_over_all_companies_to_closing(
            today, all_companies
        )
        # 3. Send mail notify renewal contract
        if today.day == 1:
            self.cronjob_service.handle_send_email_renewal_company_contract(
                today, all_companies
            )
            self.cronjob_service.handle_downgrade_plan_after_renewal_contract(
                today
            )

        # 4. Get company have status Temporary Usage and void the invoice before auto pay
        if today.day == 5:
            self.cronjob_service.handle_cancel_the_invoice_of_company_temporary_usage(
                today, all_companies
            )

        return self.response_ok(
            {
                "fake_today": today.isoformat(),
                "deleted_company_contract_count": deleted_company_contract_count,
                "deleted_tks_msg_count": deleted_tks_msg_count,
            }
        )

    @extend_schema(
        parameters=[
            OpenApiParameter("user_email", type=str, required=False),
            OpenApiParameter("user_id", type=int, required=False),
            OpenApiParameter("coin", type=int, required=False),
            OpenApiParameter("pearl", type=int, required=False),
        ]
    )
    @action(
        methods=["POST"],
        detail=False,
        url_path="seed-point",
    )
    @transaction.atomic
    def seed_point_user(self, request):
        """
        Seed points (coins and pearls) to a user for testing purposes.
        Requires either user_email or user_id to identify the user.
        """

        if not settings.DEBUG:
            raise NotFound()

        # Get parameters
        user_email = request.query_params.get("user_email")
        user_id = request.query_params.get("user_id")
        coin_amount = int(request.query_params.get("coin", 0))
        pearl_amount = int(request.query_params.get("pearl", 0))

        # Validate that at least one user identifier is provided
        if not user_email and not user_id:
            return self.response(
                "Either user_email or user_id must be provided", status_code=400
            )

        # Validate that at least one amount is provided
        if coin_amount <= 0 and pearl_amount <= 0:
            return self.response(
                "At least one of coin or pearl amount must be greater than 0",
                status_code=400,
            )

        try:
            # Find user by email or ID
            if user_email:
                user = User.objects.exclude(
                    roles__name=RoleTypes.OPERATION_ADMIN.value
                ).get(email=user_email)
            else:
                user = User.objects.exclude(
                    roles__name=RoleTypes.OPERATION_ADMIN.value
                ).get(id=user_id)
        except User.DoesNotExist:
            return self.response(
                f"User not found with {'email' if user_email else 'ID'}: {user_email or user_id}",
                status_code=404,
            )

        # Track what was added
        added_points = {}

        # Add coins if specified
        if coin_amount > 0:
            try:
                user_balance, created = UserBalance.objects.get_or_create(
                    user=user,
                    company=user.company,
                )
                user_balance.coin = (user_balance.coin or 0) + coin_amount
                user_balance.save()
                added_points["coin"] = coin_amount
            except Exception as e:
                return self.response(
                    f"Failed to add coins: {str(e)}", status_code=500
                )

        # Add pearls if specified
        if pearl_amount > 0:
            try:
                user_balance, created = UserBalance.objects.get_or_create(
                    user=user,
                    company=user.company,
                )
                user_balance.pearl = (user_balance.pearl or 0) + pearl_amount
                user_balance.save()
                added_points["pearl"] = pearl_amount
            except Exception as e:
                return self.response(
                    f"Failed to add pearls: {str(e)}", status_code=500
                )

        # Get updated balance
        user_balance = user.balances
        current_balance = {
            "coin": user_balance.coin if user_balance else 0,
            "pearl": user_balance.pearl if user_balance else 0,
        }

        return self.response_ok(
            {
                "message": "Points successfully seeded",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "name": user.full_name,
                },
                "added_points": added_points,
                "current_balance": current_balance,
            }
        )

    @action(
        methods=["GET"],
        detail=False,
        url_path="payment-method-id",
    )
    @transaction.atomic
    def fake_payment_method_id(self, request):
        """
        Create a test payment method ID for testing purposes.
        """

        if not settings.DEBUG:
            raise NotFound()

        try:
            # Initialize Stripe service
            StripeService()

            # Create test payment method using token
            payment_method = stripe.PaymentMethod.create(
                type="card", card={"token": "tok_visa"}
            )

            return self.response_ok({"payment_method_id": payment_method.id})

        except Exception as e:
            return self.response(f"Card error: {str(e)}", status_code=400)
