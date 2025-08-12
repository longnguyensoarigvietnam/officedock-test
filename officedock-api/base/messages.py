from django.utils.translation import gettext_lazy as _
from django.conf import settings

# Use this way instead of using translations for custom messages
_ERROR_MESSAGES = {
    "en": {
        "token_invalid": _("Invalid token."),
        "permission_denied": _("Permission denied."),
        "locked_error": _("Your role has changed. Please login again."),
        "invalid_ordering_field": _("Invalid ordering field: {field_name}"),
        "email_exists": _("This email is already exists."),
        "username_exists": _("This username is already exists."),
        "role_not_exist": _("This role does not exist."),
        "otp_code_invalid": _("Invalid OTP code."),
        "login_session_invalid": _(
            "Invalid login session, please login again."
        ),
        "email_invalid": _("Email incorrect."),
        "start_date_end_date_invalid": _(
            "The end date must be greater than the start date."
        ),
        "organization_superior_circular": _(
            "Can not select a circular relationship."
        ),
        "organization_not_exists": _("The organization does not exists."),
        "organization_in_use": _("The organization is already in use."),
        "invalid_basic_auth": _("Invalid basic authentication credentials."),
        "people_in_charge_not_exists": _(
            "The people in charge of ID{id} does not exists."
        ),
        "staff": _("The staff in organization of ID{id} does not exists."),
        "people_in_charge_has_task_started": _(
            "The people in charge of ID{id} is performing another task."
        ),
        "task_not_exists": _("The task does not exists."),
        "incorrect_password": _("Incorrect password."),
        "field_required": _("This field is required."),
        "login_type_does_not_match": _("The login type does not match."),
        "task_not_started": _(
            "Measurement of other tasks cannot be started because a task is already being measured."
        ),
        "last_system_admin_deleted": _(
            "The last system admin cannot be deleted"
        ),
        "last_system_admin_role_change": _(
            "The last system admin role cannot change"
        ),
        "participant_does_not_exist": _("You are not in chat room"),
        "company_not_match": _("The user is at a different company"),
        "cannot_add_member": _("Cannot add member to this group"),
        "name_of_chat_room_required": _("Group name cannot be null"),
        "cannot_updated": _("This model cannot be updated."),
        "cannot_hide_room": _("This group cannot be hidden."),
        "schedule_not_exists": _("The schedule does not exists."),
        "same_period": _("Same validity period"),
        "cannot_delete": _("Cannot delete this model"),
        "cannot_create": _("Cannot create"),
        "exists_struct": _("There are duplicate records, please check again."),
        "cannot_delete_type": _("This {type} cannot be deleted."),
        "cannot_delete_category_has_actual_duration": _(
            "This category cannot be deleted because it has actual duration."
        ),
        "read_term": _("This {type} agreed or over period."),
        "exists_index": _("This position exists"),
        "statistic_category_not_exists": _(
            "The category statistic does not exists."
        ),
        "skill_not_exists": _("The skill does not exists."),
        "unique_category_name": _("This category name is existed."),
        "unique_skill_name": _("This skill name is existed."),
        "unique_event_location_name": _("This event location name is existed."),
        "skill_not_exists_in_organization": _(
            "The skill '{names}' does not belong to the selected organization."
        ),
        "submit_level_exists": "The submit level is exists",
        "cannot_delete_system_role": "Cannot delete system role.",
        "cannot_edit_system_role": "Cannot edit system role.",
        "cannot_delete_role_linked": "This role is in use and cannot be deleted.",
        "role_exists": "This role is already exists.",
        "tag_exists": "This tag is already exists.",
        "exists_duration": "This duration is already exists.",
        "exists_task_schedule": "This task schedule is already exists.",
        "task_and_event_not_exists": "Task and event are not exists.",
        "date_invalid": "Format date is invalid.",
        "end_date_greate_than_now": "The end date cannot greate than now",
        "message_not_exists": _("This message does not exist."),
        "must_be_dictionary": _("This field is must be dictionary."),
        "status_invalid": _("Status {key} is invalid"),
        "boolean_field": _("Status of tab {key} should be True or False"),
        "max_file_size": _("File size must not exceed {max_size}."),
        "select_day": _("Must select at least one day."),
        "select_month": _("Must select at least one month."),
        "chunk_file_not_exists": _("This chunk file does not exist."),
        "organization_uuid_not_exists": _(
            "Organization with UUID {parent_uuid} does not exist."
        ),
        "organization_team_not_hierarchy": _(
            "Can not create a project team hierarchy."
        ),
        "schedule_not_in_the_past": _("Can not choose schedule in the past"),
        "cannot_select_category_other_team": _(
            "Cannot select categories from other team."
        ),
        "password_not_same": _(
            "New password must not be the same as the old password."
        ),
        "organization_linked_to_task": _(
            "This organization is linked to a task and cannot be deleted."
        ),
        # Survey
        "end_time_in_future": _(
            "Please select an end date and time in the future."
        ),
        "cannot_view_open_survey": _(
            "The user cannot view the details of an open survey."
        ),
        # Thanks messages
        "cannot_send_yourself": _("You cannot send to yourself."),
        "quota_exceeded": _(
            "You have reached your thank message limit for this month."
        ),
    },
    "ja": {
        "token_invalid": _("トークンは無効です。"),
        "permission_denied": _("この操作を実行する権限がありません。"),
        "locked_error": _("ロールが変更されました。再度ログインしてください。"),
        "invalid_ordering_field": _("この{field_name}は存在していません。"),
        "email_exists": _("このメールアドレスは既に存在しています。"),
        "username_exists": _("この名前はすでに存在しています。"),
        "role_not_exist": _("このロールが存在していません。"),
        "otp_code_invalid": _("認証コードは無効です。"),
        "login_session_invalid": _("ログインセッションが無効となりました。再度ログインしてください。"),
        "email_invalid": _("入力したメールアドレスは正しくありません。"),
        "start_date_end_date_invalid": _("終了日は開始日より後にしてください。"),
        "organization_superior_circular": _("上位組織に所属されているものが選択できません。"),
        "organization_not_exists": _("組織は存在しません。"),
        "organization_in_use": _("この組織が使用されているため、削除できません。"),
        "invalid_basic_auth": _("基本認証資格情報は無効です。"),
        "people_in_charge_not_exists": _("ID{id}の担当者が見つかりません。"),
        "staff_not_exists": _("ID{id}の従業員が見つかりません。"),
        "people_in_charge_has_task_started": _("ID{id}の担当者が別のタスクを実施しています。"),
        "task_not_exists": _("このタスクが見つかりません。"),
        "incorrect_password": _("パスワードは正しくありません。"),
        "field_required": _("この項目は必須です。"),
        "login_type_does_not_match": _("ログインのタイプが一致しません。"),
        "task_not_started": _("既に計測中のタスクがあるため、他のタスクの計測を開始できません。"),
        "last_system_admin_deleted": _("最後のシステム管理者ロールのユーザーを削除できません。"),
        "last_system_admin_role_change": _("最後のシステム管理者ロールのユーザーのロールを変更できません。"),
        "participant_does_not_exist": _("このトークルームに参加していません。"),
        "company_not_match": _("このユーザーは別の会社に所属しています。"),
        "cannot_add_member": _("このメンバーをチャットに追加できません。"),
        "name_of_chat_room_required": _("グループ名を入力してください。"),
        "cannot_updated": _("このモデルを更新できません。"),
        "schedule_not_exists": _("この予定が存在しません。"),
        "cannot_hide_room": _("グループチャットは非表示できません。"),
        "same_period": _("有効期間が重複しています。"),
        "cannot_delete": _("削除できません。"),
        "cannot_delete_type": _("この{type}を削除できません。"),
        "cannot_delete_category_has_actual_duration": _(
            "この業務カテゴリーは計測データがあるため、削除できません。"
        ),
        "read_term": _("この{type}は同意済か有効期限が切れています。"),
        "cannot_create": _("作成できません。"),
        "exists_struct": _("重複しているレコードがあります。再度確認してください。"),
        "exists_index": _("この位置がすでに存在しています。"),
        "statistic_category_not_exists": _("この集計カテゴリが存在しません。"),
        "skill_not_exists": _("このスキルが存在しません。"),
        "unique_category_name": _("このカテゴリー名はすでに存在しています。"),
        "unique_skill_name": _("スキル名はすでに存在しています。"),
        "unique_event_location_name": _("場所名が既に存在しています。"),
        "skill_not_exists_in_organization": _("「{names}」スキルは選択した組織に所属していません。"),
        "submit_level_exists": "このレベルアップ申請がすでに存在しています。",
        "cannot_delete_system_role": "システムロールは削除できません。",
        "cannot_edit_system_role": "システムロールは編集できません。",
        "cannot_delete_role_linked": "このロールが使用されているため、削除できません。",
        "role_exists": "このロールがすでに存在しています。",
        "tag_exists": "このタグがすでに存在しています。",
        "exists_duration": "この計測時間がすでに存在しています。",
        "exists_task_schedule": "実施予定日時が重複しています。",
        "task_and_event_not_exists": _("タスクと予定は存在しません。"),
        "date_invalid": _("日は無効です。"),
        "end_date_greate_than_now": _("計測時間は未来の時刻で登録できません。"),
        "message_not_exists": _("このメッセージが存在していません。"),
        "must_be_dictionary": _("このフィールドはオブジェクトでなければなりません。"),
        "status_invalid": _("{key}ステータスは無効です。"),
        "boolean_field": _("{key}タブのステータスは「True」 か「 False」でなければなりません。"),
        "max_file_size": _("{max_size}以下のファイルをアップロードしてください。"),
        "select_day": _("いずれか1日を選択してください。"),
        "select_month": _("いずれか1月を選択してください。"),
        "chunk_file_not_exists": _("このチャンクファイルが存在していません。"),
        "organization_uuid_not_exists": _("{parent_uuid}の組織が存在していません。"),
        "organization_team_not_hierarchy": _("プロジェクトチームの階層を作成できません。"),
        "schedule_not_in_the_past": _("実施予定日時は未来の日時を選択してください。"),
        "cannot_select_category_other_team": _("他のチームのカテゴリーを選択できません。"),
        "password_not_same": _("現在のパスワードと同じパスワードは使用できません。"),
        "organization_linked_to_task": _("この組織はタスクに紐づいているため、削除できません。"),
        # Survey
        "end_time_in_future": _("未来の日時を設定してください。"),
        "cannot_view_open_survey": _("受付中のアンケートの詳細を見ることはできません。"),
        # Thanks messages
        "cannot_send_yourself": _("自分自身にサンクスメッセージを送ることはできません。"),
        "quota_exceeded": _("今月のサンクスメッセージ送信可能回数は上限に達しました。"),
    },
}

_KEYWORDS = {
    "en": {
        "term_of_use": "Term of use",
        "privacy_policy": "Privacy policy",
        "comma": ",",
        "organization": "Organization",
        "category": "Category",
        "skill": "Skill",
        "skill_map": "Skill map",
    },
    "ja": {
        "term_of_use": "利用規約",
        "privacy_policy": "プライバシーポリシー",
        "comma": "、",
        "organization": "組織",
        "category": "カテゴリー",
        "skill": "スキル",
        "skill_map": "スキルマップ",
    },
}

ERROR_MESSAGES = _ERROR_MESSAGES[settings.LANGUAGE_CODE]
KEYWORDS = _KEYWORDS[settings.LANGUAGE_CODE]
