import time, requests, json
from django.conf import settings
import hashlib, hmac
from dotmoney.constants import (
    ACCOUNT_DEPOSIT_PATH_TEMPLATE,
    ACCOUNT_PATH_TEMPLATE,
    EXCHANGE_COMPLETE_PATH_TEMPLATE,
    EXCHANGE_OEM_PATH,
)


class DotMoneyService:
    """
    Service for interacting with DotMoney APIs and building OEM exchange URLs.

    Key concepts:
    - API requests (e.g., deposit, account info) use HMAC signatures over the canonical request
      with Authorization header: <version>_<access_key>_<access_date>_<signature>.
    - OEM exchange URLs (redirect flows) include signed query params, including the versioned signature.
    """

    def __init__(self) -> None:
        """
        Initialize service and validate that required DotMoney settings are present.
        """
        if (
            not settings.DOTMONEY_ACCESS_KEY
            or not settings.DOTMONEY_SECRET_KEY
            or not settings.DOTMONEY_PRODUCT_ID
            or not settings.DOTMONEY_BASE_API
            or not settings.DOTMONEY_BASE_URL
            or not settings.DOTMONEY_VERSION
        ):
            raise ValueError(
                "DotMoney configuration is incomplete. Please check DOTMONEY_ACCESS_KEY, "
                "DOTMONEY_SECRET_KEY, DOTMONEY_PRODUCT_ID, DOTMONEY_BASE_API, "
                "DOTMONEY_BASE_URL, and DOTMONEY_VERSION settings."
            )

    def verify_signature(self, query_string, path: str, access_date) -> bool:
        """
        Verify a callback/query signature from DotMoney.

        Args:
            query_string (str): Raw query string including 'signature' parameter.
            path (str): Canonical URI used to compute the signature (e.g., EXCHANGE_OEM_PATH).
            access_date (int): Access date provided in the request.

        Returns:
            bool: True if the provided signature matches the expected signature, otherwise False.
        """
        # Extract canonical query string and provided signature
        query_string_split = query_string.split("&signature=")
        canonical_query = query_string_split[0]
        provided_sig = query_string_split[1]

        # Compute expected signature from canonical request
        expected = self.generate_signature(
            request_date=int(access_date),
            http_method="GET",
            canonical_uri=path or "",
            canonical_query=canonical_query,
        )
        return provided_sig == f"{settings.DOTMONEY_VERSION}_{expected}"

    # ---------------------------
    # Authorization header helpers
    # ---------------------------

    def _auth_header_api(
        self,
        method: str,
        path: str,
        canonical_query: str = "",
        payload: str = "",
    ):
        """
        Build Authorization header for DotMoney API requests (server-to-server).
        Signature format: <version>_<access_key>_<access_date>_<signature>.
        """
        access_date = int(time.time())

        signature = self.generate_signature(
            request_date=access_date,
            http_method=method,
            canonical_uri=path,
            canonical_query=canonical_query,
            payload=payload,
        )

        return {
            "Content-Type": "application/json",
            "Authorization": f"{settings.DOTMONEY_VERSION}_{settings.DOTMONEY_ACCESS_KEY}_{access_date}_{signature}",
        }

    def _auth_header_exchange(
        self,
        method: str,
        path: str,
        user_id: str,
        user_name: str,
        balance: int,
        request_type: int | None = None,
    ):
        """
        Build Authorization header parameters for OEM exchange-like flows.

        This is used for generating signed query params (user and product info).
        Note: This method only returns headers. For a full redirect URL,
        use `build_exchange_url`.
        """
        access_date = int(time.time())

        # Query params included in signature
        params = {
            "user_id": user_id,
            "user_name": user_name,
            "balance": balance,
            "access_key": settings.DOTMONEY_ACCESS_KEY,
            "access_date": access_date,
            "product_id": settings.DOTMONEY_PRODUCT_ID,
        }
        if request_type is not None:
            params["request_type"] = request_type

        sorted_params = self._sorted_query_params(params)

        signature = self.generate_signature(
            request_date=access_date,
            http_method=method,
            canonical_uri=path,
            canonical_query=sorted_params,
        )

        return {
            "Content-Type": "application/json",
            "Authorization": f"{settings.DOTMONEY_VERSION}_{settings.DOTMONEY_ACCESS_KEY}_{access_date}_{signature}",
        }

    # ---------------------------
    # API methods
    # ---------------------------

    def deposit(self, user_id, amount: int):
        """
        Deposit DotMoney into a user's account.

        Request:
            POST {DOTMONEY_BASE_API}/account/exid-{user_id}/deposit
        Body:
            {
                "request_id": "<unique id>",
                "amount": <int>,
                "product_id": "<configured product id>"
            }
        Auth:
            API auth header derived from canonical request.
        """
        request_id = f"req-{int(time.time())}-{user_id}"
        path = ACCOUNT_DEPOSIT_PATH_TEMPLATE.format(user_id=user_id)
        url = self._build_full_url(path, endpoint=settings.DOTMONEY_BASE_API)

        body_obj = {
            "request_id": request_id,
            "amount": amount,
            "product_id": settings.DOTMONEY_PRODUCT_ID,
        }
        # Stable JSON (no spaces, deterministic ordering) for payload signing
        body = json.dumps(body_obj, separators=(",", ":"), ensure_ascii=False)

        headers = self._auth_header_api(
            method="POST",
            path=path,
            canonical_query="",
            payload=body,
        )

        resp = requests.post(url, data=body, headers=headers, timeout=3000)
        return resp.status_code

    def account_info(self, user_id: str):
        """
        Retrieve DotMoney account info for a user.

        Request:
            GET {DOTMONEY_BASE_API}/account/exid-{user_id}?product_id=<id>
        """
        path = ACCOUNT_PATH_TEMPLATE.format(user_id=user_id)
        query = f"product_id={settings.DOTMONEY_PRODUCT_ID}"
        url = self._build_full_url(path, query_params=query)

        headers = self._auth_header_api(
            method="GET",
            path=path,
            canonical_query=query,
        )

        resp = requests.get(url, headers=headers, timeout=10)
        return resp.status_code

    def redirect_exchange_complete(
        self,
        user_id,
        user_name,
        withdrawal_product_type,
        withdrawal_product_id,
        access_date,
        balance,
        state,
        complete,
    ):
        """
        Build redirect URL for DotMoney exchange completion screen.

        Args:
            user_id (str): User identifier.
            user_name (str): User name.
            withdrawal_product_type (str): Type of withdrawal product.
            withdrawal_product_id (str): Product identifier.
            access_date (int): Access timestamp.
            balance (int): User's balance.
            state (str): State parameter from the request.
            complete (str): Completion status flag.

        Returns:
            str: Signed redirect URL.
        """
        path = EXCHANGE_COMPLETE_PATH_TEMPLATE.format(
            withdrawal_product_type=withdrawal_product_type,
            withdrawal_product_id=withdrawal_product_id,
        )

        params = {
            "user_id": user_id,
            "user_name": user_name,
            "access_key": settings.DOTMONEY_ACCESS_KEY,
            "access_date": access_date,
            "product_id": settings.DOTMONEY_PRODUCT_ID,
            "balance": balance,
            "state": state,
            "complete": complete,
        }

        sorted_params = self._sorted_query_params(params)

        signature = self.generate_signature(
            request_date=access_date,
            http_method="GET",
            canonical_uri=path,
            canonical_query=sorted_params,
        )
        full_query_params = (
            f"{sorted_params}&{self._build_signature_query_params(signature)}"
        )

        return self._build_full_url(path=path, query_params=full_query_params)

    # ---------------------------
    # OEM exchange URL
    # ---------------------------

    def build_exchange_url(
        self,
        user_id: str,
        user_name: str,
        balance: int,
        request_type: int | None = None,
        is_login=False,
    ) -> str:
        """
        Generate the URL to redirect the user to DotMoney exchange screen.

        Args:
            user_id (str): User identifier.
            user_name (str): User name.
            balance (int): User balance.
            request_type (int|None): Optional request type.
            is_login (bool): If True, build a login redirect URL instead of exchange.

        Returns:
            str: Signed redirect URL.
        """
        access_date = int(time.time())
        path = EXCHANGE_OEM_PATH

        # Query params before signature
        params = {
            "user_id": user_id,
            "user_name": user_name,
            "balance": balance,
            "access_key": settings.DOTMONEY_ACCESS_KEY,
            "access_date": access_date,
            "product_id": settings.DOTMONEY_PRODUCT_ID,
        }
        if is_login:
            # For login flow, root path is used
            path = "/"
            params["login_flag"] = 1

        if request_type is not None:
            params["request_type"] = request_type

        sorted_params = self._sorted_query_params(params)

        signature = self.generate_signature(
            request_date=access_date,
            http_method="GET",
            canonical_uri=path,
            canonical_query=sorted_params,
        )
        full_query_params = (
            f"{sorted_params}&{self._build_signature_query_params(signature)}"
        )

        return self._build_full_url(path=path, query_params=full_query_params)

    # ---------------------------
    # Crypto helpers
    # ---------------------------

    def generate_signature(
        self,
        request_date: int,
        http_method: str,
        canonical_uri: str,
        canonical_query: str | None = None,
        payload: str = "",
    ) -> str:
        """
        Generate HMAC-SHA256 signature for a DotMoney canonical request.

        Args:
            request_date (int): Unix timestamp.
            http_method (str): HTTP method (GET, POST, ...).
            canonical_uri (str): Request path.
            canonical_query (str): Sorted query string.
            payload (str): JSON payload for POST/PUT requests.

        Returns:
            str: Hex-encoded HMAC signature.
        """
        method = http_method.upper()
        canonical_query = canonical_query or ""
        payload_str = payload or ""

        # Canonical request string
        canonical_request = f"{request_date}\n{method}\n{canonical_uri}\n{canonical_query}\n{payload_str}"

        # Hash canonical request
        hashed_canonical_request = hashlib.sha256(
            canonical_request.encode("utf-8")
        ).hexdigest()

        # Sign with secret key
        signature = hmac.new(
            settings.DOTMONEY_SECRET_KEY.encode("utf-8"),
            hashed_canonical_request.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return signature

    # ---------------------------
    # Util helpers
    # ---------------------------

    def _sorted_query_params(
        self, params: dict, is_exclude_signature: bool = True
    ) -> str:
        """
        Convert dict of query params to canonical query string with alphabetically sorted keys.
        By default, excludes the 'signature' key (useful for verification).
        """
        keys = sorted(params.keys())
        parts = []
        for k in keys:
            if is_exclude_signature and k == "signature":
                continue
            parts.append(f"{k}={params[k]}")
        return "&".join(parts)

    def _build_signature_query_params(self, signature: str) -> str:
        """
        Build versioned signature query param.
        Format: signature=<version>_<hex-signature>
        """
        return f"signature={settings.DOTMONEY_VERSION}_{signature}"

    @staticmethod
    def _build_full_url(
        path: str,
        endpoint: str = settings.DOTMONEY_BASE_URL,
        query_params: str | None = None,
    ) -> str:
        """
        Join base URL and path safely, and append query string if provided.
        """
        full_url = f"{endpoint}{path}"
        if query_params:
            full_url += f"?{query_params}"
        return full_url
