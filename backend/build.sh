#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies using pip
pip install --upgrade pip
pip install -r requirements.txt

# Run migrations and collect static files
python manage.py collectstatic --no-input
python manage.py migrate
