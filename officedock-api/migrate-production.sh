#!/bin/bash

python manage.py migrate
python manage.py seed_data_role
python manage.py seed_data_admin
python manage.py seed_data_task_status
python manage.py seed_data_shop_items
