#!/bin/bash

python manage.py migrate
python manage.py seed_data_role
python manage.py seed_data_admin
python manage.py seed_data_task_status

# Remove after deploy
python manage.py seed_plans_to_stripe
python manage.py seed_company_plan
