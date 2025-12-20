"""
Task routes package.

Import job tasks only (scheduled/periodic tasks are registered by Taskiq worker/scheduler).
"""

# pylint: disable=unused-import

try:
    from tasks import process_model_event, reset_online_users
except Exception:  # pylint: disable=broad-except
    # Avoid breaking route discovery if taskiq deps/workers are unavailable.
    process_model_event = None
    reset_online_users = None
