from rest_framework.filters import OrderingFilter
from rest_framework.exceptions import ValidationError
from base.messages import ERROR_MESSAGES


class CustomOrderFilter(OrderingFilter):
    """
    CustomOrderFilter allows dynamic ordering of querysets based on a mapping
    of short field names to actual model fields. This filter retrieves the
    ordering fields configuration from the view and applies the ordering to
    the queryset.
    """

    def get_ordering(self, request, queryset, view):
        """
        Retrieve the ordering parameters from the request and validate them
        against the allowed custom filters defined in the view.
        """

        # Retrieve the ordering fields mapping from the view
        ordering_fields = getattr(view, "ordering_fields", {})
        # Get the list key of custom filters
        custom_filters = list(ordering_fields.keys())

        # Retrieve the ordering parameters from the request query parameters
        params = request.query_params.get(self.ordering_param)
        if params:
            # Split the parameters by comma and strip any extra whitespace
            fields = [param.strip() for param in params.split(",")]
            # Filter out any fields that are not allowed custom filters
            ordering = [f for f in fields if f.lstrip("-") in custom_filters]
            if ordering:
                return ordering

        return self.get_default_ordering(view)

    def filter_queryset(self, request, queryset, view):
        """
        Apply the ordering to the queryset based on the validated ordering fields.
        """
        # Retrieve the ordering fields mapping from the view
        ordering_fields = getattr(view, "ordering_fields", {})
        # Get the validated ordering fields
        ordering = self.get_ordering(request, queryset, view)

        if ordering:
            order_fields = []
            for field in ordering:
                # Determine if the ordering is descending
                symbol = "-" if field.startswith("-") else ""
                field_name = field.lstrip("-")
                try:
                    # Map the short field name to the actual model field name
                    order_fields.append(
                        f"{symbol}{ordering_fields[field_name]}"
                    )
                except KeyError:
                    # Raise a validation error if the field name is not in the ordering fields
                    raise ValidationError(
                        {
                            "detail": ERROR_MESSAGES[
                                "invalid_ordering_field"
                            ].format(field_name=field_name)
                        }
                    )
            if order_fields:
                # Apply the ordering to the queryset
                return queryset.order_by(*order_fields)

        return queryset
