from rest_framework import routers

from calendars.apis import (
    EventLocationViewSet,
    CalendarViewSet,
    ScheduleViewSet,
    ScheduleTeamdockViewSet,
)
from companies.apis import SystemCompanyViewSet
from stat_data.apis import StatDataViewSet
from skills.apis import (
    StatisticCategoryViewSet,
    ManageSkillMapViewSet,
    SkillViewSet,
    SkillMapViewSet,
)
from statistics.apis import (
    StatisticViewSet,
    OrganizationStatisticViewSet,
    AllTeamStatisticViewSet,
)
from submit_levels.apis import SubmitLevelViewSet
from tasks.apis import (
    TaskBoardViewSet,
    TaskCalendarViewSet,
    TaskScheduleViewSet,
    TaskTeamdockViewSet,
    TaskViewSet,
    TodoListViewSet,
)
from terms.apis import SystemTermViewSet
from tweets.apis import TweetsView
from users.apis import (
    SystemAuthViewSet,
    SystemUserMemoViewSet,
    SystemUserViewSet,
)
from organizations.apis import (
    OrganizationByIDViewSet,
    OrganizationViewSet,
    OrganizationCategoryHierarchyViewSet,
    TeamViewSet,
)
from common.apis import (
    DotMoneyViewSet,
    SystemCreationDataViewSet,
    CronJobViewSet,
)
from tags.apis import TagViewSet
from dashboard.apis import (
    ActualDurationViewSet,
    DashboardViewSet,
    DurationViewSet,
)
from chat.apis import ChatFileViewSet, ChatMessageViewSet, ChatRoomViewSet
from roles.apis import RoleViewSet
from surveys.apis import SurveyViewSet
from thanks_messages.apis import (
    ThanksMessageManagementViewSet,
    ThanksMessageViewSet,
)
from mvp_votes.apis import MVPVoteManagementViewSet, MVPVoteViewSet

# Routers provide an easy way of automatically determining the URL conf.
api_router = routers.SimpleRouter()

# Register router view set
api_router.register("auth", SystemAuthViewSet, basename="system_auth")
api_router.register(
    "companies", SystemCompanyViewSet, basename="system_company"
)
api_router.register(
    "organizations", OrganizationViewSet, basename="organizations_by_uuid"
)
api_router.register(
    "organizations", OrganizationByIDViewSet, basename="organizations_by_id"
)
api_router.register("users", SystemUserMemoViewSet, basename="users_memos")
api_router.register("users", SystemUserViewSet, basename="users")
api_router.register("tags", TagViewSet, basename="tags")
api_router.register(
    "creation-data", SystemCreationDataViewSet, basename="creation_data"
)
api_router.register(
    "tasks/calendar", TaskCalendarViewSet, basename="tasks_calendar"
)
api_router.register("tasks/board", TaskBoardViewSet, basename="tasks_board")
api_router.register(
    "tasks/schedules", TaskScheduleViewSet, basename="task_schedule"
)
api_router.register(
    "tasks/teamdock", TaskTeamdockViewSet, basename="task_teamdock"
)
api_router.register("tasks", TaskViewSet, basename="tasks")
api_router.register("todo-list", TodoListViewSet, basename="todo_list")
api_router.register("dashboard", DashboardViewSet, basename="dashboard")
api_router.register("chat", ChatRoomViewSet, basename="chat")
api_router.register("messages", ChatMessageViewSet, basename="messages")
api_router.register(
    "statistic-categories",
    StatisticCategoryViewSet,
    basename="statistic_categories",
)
api_router.register(
    "organization-category-hierarchies",
    OrganizationCategoryHierarchyViewSet,
    basename="org_category_hierarchies",
)
api_router.register("schedules", ScheduleViewSet, basename="schedules")
api_router.register(
    "event-locations", EventLocationViewSet, basename="event-locations"
)
api_router.register(
    "teamdock/schedules", ScheduleTeamdockViewSet, basename="teamdock-schedules"
)
api_router.register("calendars", CalendarViewSet, basename="calendars")
api_router.register("durations", DurationViewSet, basename="durations")
api_router.register(
    "actual-durations", ActualDurationViewSet, basename="actual_durations"
)
api_router.register("terms", SystemTermViewSet, basename="terms")
api_router.register("stat-data", StatDataViewSet, basename="stat_data")
api_router.register(
    "manage-skill-maps", ManageSkillMapViewSet, basename="mange_skill_maps"
)
api_router.register("skill-maps", SkillMapViewSet, basename="skill_maps")
api_router.register("skills", SkillViewSet, basename="skills")
api_router.register(
    "submit-levels", SubmitLevelViewSet, basename="submit-levels"
)
api_router.register("roles", RoleViewSet, basename="roles")
api_router.register("cron-jobs", CronJobViewSet, basename="cron_jobs")
api_router.register("chat-files", ChatFileViewSet, basename="chat_files")
api_router.register("statistics", StatisticViewSet, basename="statistics")
api_router.register(
    "all-team-statistics",
    AllTeamStatisticViewSet,
    basename="all_team_statistics",
)
api_router.register(
    "organization-statistics",
    OrganizationStatisticViewSet,
    basename="organization_statistics",
)
api_router.register(
    "teams",
    TeamViewSet,
    basename="teams",
)
api_router.register("surveys", SurveyViewSet, basename="surveys")
api_router.register(
    "tweets",
    TweetsView,
    basename="tweets",
)
api_router.register(
    "thanks-messages", ThanksMessageViewSet, basename="thanks_messages"
)
api_router.register(
    "thanks-messages-management",
    ThanksMessageManagementViewSet,
    basename="thanks_messages_management",
)
api_router.register(
    "mvp-vote-management",
    MVPVoteManagementViewSet,
    basename="mvp_vote_management",
)
api_router.register("mvp-vote", MVPVoteViewSet, basename="mvp_vote")
api_router.register("dotmoney", DotMoneyViewSet, basename="dotmoney")

# Add api router urls
urlpatterns = []
urlpatterns += api_router.urls
