#!/bin/bash

gunicorn core.asgi:application -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT --workers $WORKERS_COUNT --threads $THREADS_COUNT --timeout 0
