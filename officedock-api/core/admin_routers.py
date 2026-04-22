from rest_framework import routers
from common.apis import AdminCreationDataViewSet
from companies.apis import CompanyViewSet
from terms.apis import AdminTermViewSet

from users.apis import AdminAuthViewSet, AdminUserViewSet

# Routers provide an easy way of automatically determining the URL conf.
api_router = routers.SimpleRouter()

# Register router view set
api_router.register("auth", AdminAuthViewSet, basename="admin_auth")
api_router.register("companies", CompanyViewSet, basename="companies")
api_router.register("users", AdminUserViewSet, basename="users")
api_router.register("terms", AdminTermViewSet, basename="terms")
api_router.register(
    "creation-data", AdminCreationDataViewSet, basename="creation_data"
)

# Add api router urls
urlpatterns = []
urlpatterns += api_router.urls
