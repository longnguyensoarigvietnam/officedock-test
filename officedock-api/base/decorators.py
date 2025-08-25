from functools import wraps
from django.core.cache import cache
from rest_framework.response import Response
import hashlib
import urllib.parse


def user_cache_page(timeout=60 * 5, key_prefix="user_cache"):
    """
    Cache DRF responses per user.id + request query params
    (stores response.data only)
    """

    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(view, request, *args, **kwargs):
            if not request.user.is_authenticated:
                return view_func(view, request, *args, **kwargs)

            # Normalize query params (sorted to avoid different orders giving different keys)
            query_string = urllib.parse.urlencode(
                sorted(request.query_params.items())
            )
            raw_key = f"{key_prefix}:{request.user.id}:{query_string}"
            cache_key = hashlib.md5(raw_key.encode("utf-8")).hexdigest()

            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data)

            response = view_func(view, request, *args, **kwargs)
            if isinstance(response, Response):
                cache.set(cache_key, response.data, timeout)
            return response

        return _wrapped_view

    return decorator
