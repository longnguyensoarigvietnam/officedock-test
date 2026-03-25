#!/bin/bash

python manage.py migrate
python manage.py seed_data_role
python manage.py seed_data_admin
python manage.py seed_data_task_status

# Remove after deploy staging
python manage.py update_company_temporary_usage_status --company-id=13
