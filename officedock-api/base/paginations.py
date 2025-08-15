from urllib.parse import urlparse
from rest_framework.pagination import PageNumberPagination, CursorPagination
from rest_framework.response import Response


class BasePagination(PageNumberPagination):
    """
    The custom of page number pagination
    """

    page_size_query_param = "page_size"

    def get_paginated_response(self, data, **kwargs):
        response_data = {
            "count": self.page.paginator.count,
            "has_next": self.page.has_next(),
            "num_pages": self.page.paginator.num_pages,
            "results": data,
        }
        response_data.update(kwargs)
        return Response(response_data)


class CustomCursorPagination(CursorPagination):
    """
    The custom of cursor pagination
    """

    page_size = 20
    cursor_query_param = "cursor"
    page_size_query_param = "page_size"

    def paginate_queryset(self, queryset, request, view=None):
        """
        Get ordering from view if exists (view.ordering),
        when request doesn't send ?ordering=...
        """
        self.request = request
        self.ordering = "-id"

        # If request has ordering param => use it
        ordering_param = request.query_params.get("ordering")
        if ordering_param:
            self.ordering = ordering_param.split(",")

        # If no ordering param => inherit from view.ordering
        elif view and getattr(view, "ordering", None):
            self.ordering = view.ordering

        return super().paginate_queryset(queryset, request, view=view)

    def get_next_link(self):
        """
        Get the URL for the next page in pagination.
        """
        link = super().get_next_link()
        if link:
            parsed = urlparse(link)
            return f"?{parsed.query}"
        return None

    def get_previous_link(self):
        """
        Get the URL for the previous page in pagination.
        """
        link = super().get_previous_link()
        if link:
            parsed = urlparse(link)
            return f"?{parsed.query}"
        return None
