import time

from django.db import transaction
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated

from base.apis import BaseAPIViewSet
from dotmoney.service import DotMoneyService
from users.models import User
from dotmoney.constants import DOTMONEY_EXCHANGE_PATH, ExchangeStatus
from users.constants import TransactionTypes


@extend_schema(tags=["System > DotMoney"])
class DotMoneyViewSet(BaseAPIViewSet):
    """API endpoints for DotMoney integration"""

    # Allow DotMoney callback without authentication
    permission_classes = [AllowAny]

    @action(
        methods=["GET"],
        detail=False,
        url_path="exchange",
    )
    @transaction.atomic()
    def exchange(self, request):
        """
        Exchange entrypoint (DotMoney callback).
        DotMoney calls this endpoint after the user completes the flow.
        """
        # Extract query params
        params = request.query_params.dict()
        query_string = request.META.get("QUERY_STRING")

        # Required params from DotMoney
        user_id = params.get("user_id")
        withdrawal_product_type = params.get("withdrawal_product_type")
        withdrawal_product_id = params.get("withdrawal_product_id")
        api_version = params.get("api_version")
        amount = int(params.get("amount", 0))
        access_date = int(params.get("access_date", 0))
        state = params.get("state", "")
        user_name_param = params.get("user_name")

        dotmoney_service = DotMoneyService()

        def redirect_complete(complete_flag: str, user_obj: User | None = None):
            """
            Redirect user to DotMoney completion screen
            with success/failure status and user/balance info.
            """
            user_name = user_name_param or (
                getattr(user_obj, "full_name", None) or ""
            )
            balance = getattr(user_obj, "coin", None)

            # Fall back to query param balance if user_obj is not available
            if balance is None:
                try:
                    balance = int(params.get("balance", 0))
                except Exception:
                    balance = 0

            # Build redirect URL
            url = dotmoney_service.redirect_exchange_complete(
                user_id=user_id or "",
                user_name=user_name,
                withdrawal_product_type=withdrawal_product_type or "",
                withdrawal_product_id=withdrawal_product_id or "",
                access_date=access_date or int(time.time()),
                balance=balance,
                state=state,
                complete=complete_flag,
            )
            # HTTP 302 redirect
            return Response(
                status=status.HTTP_302_FOUND, headers={"Location": url}
            )

        # 1. Validate required params
        if not user_id or amount <= 0 or not query_string:
            return redirect_complete(ExchangeStatus.NG.value)

        # 2. Check timestamp validity (±10 minutes allowed)
        if abs(int(time.time()) - access_date) > 600:
            return redirect_complete(ExchangeStatus.NG.value)

        # 3. Check supported API version (must be v2)
        if api_version not in [2, "2"]:
            return redirect_complete(ExchangeStatus.NG.value)

        # 4. Verify request signature from DotMoney
        if not dotmoney_service.verify_signature(
            query_string, DOTMONEY_EXCHANGE_PATH, access_date
        ):
            return redirect_complete(ExchangeStatus.NG.value)

        # 5. Validate user existence and balance
        try:
            user = User.objects.get(id=user_id)

            # User must have enough coins to exchange
            if user.coin < amount or user.exchangeable_coin < amount:
                return redirect_complete(ExchangeStatus.NG.value, user_obj=user)

            # Deduct user's coin balance atomically
            user.use_coin(
                amount=amount, transaction_type=TransactionTypes.EXCHANGE.value
            )
        except Exception:
            return redirect_complete(ExchangeStatus.NG.value)

        # 6. Call DotMoney Deposit API to grant DotMoney currency
        result = dotmoney_service.deposit(user_id, amount)

        if result != 200:
            return redirect_complete(ExchangeStatus.NG.value, user_obj=user)

        # 7. Everything OK → redirect success
        return redirect_complete(ExchangeStatus.OK.value, user_obj=user)

    @extend_schema(
        parameters=[
            OpenApiParameter("is_login", type=bool),
            OpenApiParameter("callback", type=str),
        ],
    )
    @action(
        methods=["GET"],
        detail=False,
        url_path="exchange-url",
        permission_classes=[IsAuthenticated],
    )
    def exchange_url(self, request):
        """
        Build the DotMoney Exchange URL for frontend redirect.
        This URL will be used to start the DotMoney flow.
        """
        # Parse request params
        is_login = request.query_params.get("is_login", "").lower() == "true"

        # Current authenticated user
        user = request.user
        user_id = user.id
        user_name = user.full_name
        balance = user.coin

        # Build full exchange URL using DotMoney service
        full_url = DotMoneyService().build_exchange_url(
            user_id=user_id,
            balance=balance,
            user_name=user_name,
            is_login=is_login,
        )

        return self.response_ok({"exchange_url": full_url})
