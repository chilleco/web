# UserHub Integration Guide
Copy this file into `docs/` of any project that integrates the `userhub` PyPI package so maintainers and AI code writers know the contract, expectations, and edge cases.

## What UserHub Is
- Thin async client for the centralized Chill Services user platform (`https://chill.services/api/`).
- No local database or session management: all state is stored in the core service and accessed over HTTP.
- Ships a user schema (`BaseUser`) that mirrors the platform’s user fields and validation rules from `consys`.
- Intended for reuse across all projects that share the unified user base.

## How It Differs From Typical Auth Libraries
- **Central truth lives remotely:** you never create or persist users locally; every call hits the Chill API.
- **Async-only API:** `auth`, `token`, and user fetches are `async` coroutines; they must be `await`ed.
- **Strict data contract:** phone numbers are normalized (strip non-digits, convert leading `8` to `7`, length 11–18) and emails must match `.+@.+\..+`.
- **Role/status model is predefined:** status codes (0–8) come from the platform and map to permissions (see below).
- **Minimal config knobs:** locale comes from `libdev.cfg("locale", default="en")`; other options are passed per call.

## Installation
```bash
pip install userhub
```
Requires Python 3.8+ (ready for 3.14). Runtime dependencies: `libdev` and `consys` (pulled automatically).

### Development setup
```bash
pip install -e .[dev]
```
Uses `pyproject.toml` (PEP 621) for all metadata and dependencies; no `requirements.txt`.

## Core Endpoints Used
- `POST https://chill.services/api/account/proj/` – authenticate a user and mint/refresh a token.
- `POST https://chill.services/api/account/proj_token/` – store or refresh a session token.
- `POST https://chill.services/api/users/get/` – fetch user records (single or list).
All HTTP calls are performed through `libdev.req.fetch`; errors are logged with `libdev.log.log` and return safe fallbacks instead of raising.

## API Surface
### `detect_type(login: str) -> str`
Heuristically labels a login as `phone`, `mail`, or `login`. Internally uses phone preprocessing and email regex. Helpful to route UI/BE logic without duplicating heuristics.

### `auth(...) -> tuple[user|None, str, bool]`
Authenticates against the platform.
- Required: `project` (project identifier known to the platform), `by` (auth method, e.g., `token`, `password`, `phone`, `mail`, `social`), `token` (session or temporary token).
- Optional context: `network` (social network/provider id, default 0), `ip`, `locale`, `login`, `social`, `user`, `password`, `name`, `surname`, `image`, `mail`, `utm`, `online`, `check_password` (enforce password match server-side).
- Returns `(user_dict_or_None, issued_token, is_new_user_bool)`. On non-200 responses, logs the error and returns `(None, token, False)`.

### `token(...) -> tuple[str|None, str|int, int]`
Persists a session token and metadata.
- Required: `project`, `token`.
- Optional: `network`, `utm`, `extra` (dict for arbitrary metadata), `ip`, `locale`, `user_agent`.
- Returns `(token, user_id, status_code)` where `status_code` is provided by the platform (2 is the default error code used locally on failure). Logs errors and returns `(None, 0, 2)` when the API call fails.

### `BaseUser`
Data container that mirrors the platform’s user shape and validation rules. It does not persist locally; instances are populated from API responses.
- Notable fields (validation provided by `consys` handlers): `login`, `password`, `name`, `surname`, `title`, `phone`, `mail`, `social`, `description`, `status`, `rating`, `discount`, `balance`, `subscription`, `utm`, `mailing`, `last_online`, etc. Phones and emails are validated for uniqueness server-side via the platform.
- Status meanings: `0` deleted, `1` blocked, `2` unauthorized, `3` authorized, `4` platform access, `5` supervisor, `6` moderator, `7` admin, `8` owner.
- Methods:
  - `BaseUser.get(token, **filters)` → `BaseUser` or `list[BaseUser]` or error string. Filters are forwarded to `/users/get/`.
  - `BaseUser.complex(token, **filters)` → raw `dict` from `/users/get/`.
  - `BaseUser.get_social(social_id)` → social info dict from `self.social` or `None`.

## Typical Integration Flow
1) Decide login type: `by = detect_type(login_input)` or use the path the client chose (password, social, etc.).
2) Call `await auth(project=PROJECT_ID, by=by, token=session_token, login=login_input, password=... , social=..., online=True)` in your login handler.
3) Store the returned `token` (it may be rotated). Persist it client-side (cookie/header) and, if needed, call `token()` to record device/user agent/UTM.
4) Fetch user data as needed: `user = await BaseUser.get(token, user=id)` for a single user or `BaseUser.complex` for raw payloads.
5) Use `user.status` to gate access—values come from the platform; do not reinterpret locally.

## Error and Logging Behavior
- All network errors or non-200 responses are logged via `libdev.log.log`.
- Functions return fallbacks instead of raising; callers must check for `None`/error strings and handle gracefully.
- Tokens can be rotated by the platform; always persist the returned token rather than the one you sent.

## Implementation Notes and Contracts
- Phone preprocessing: leading `8` → `7`, strip non-digits, accept length 11–18; failing this marks the value invalid.
- Emails must match `.+@.+\..+`. Any other identifier is treated as `login`.
- Locale defaults to `libdev.cfg("locale", "en")`; override per call when you need localized server responses.
- The commented-out `Base` hints at an ORM base, but current package only models data; no DB connection is opened.
- The library trusts the Chill API for uniqueness checks (`check_*_uniq`), password processing, and permission assignment; do not replicate these rules locally.

## Minimal Usage Example
```python
from userhub import auth, token as save_token, detect_type, BaseUser

PROJECT_ID = "my-service"

async def login_handler(login_input, password):
    by = detect_type(login_input)
    user, issued_token, is_new = await auth(
        project=PROJECT_ID,
        by=by,
        token="temporary-session-token",
        login=login_input,
        password=password,
        online=True,
        check_password=True,
    )
    if not user:
        return None, "auth_failed"

    await save_token(project=PROJECT_ID, token=issued_token, user_agent="api/1.0")
    return issued_token, user
```

## When to Avoid Local Changes
- Do not alter user validation or status meanings locally; rely on the platform responses.
- Do not cache user objects without honoring token rotation; fetch fresh data when access level matters.
- Do not attempt to mint tokens yourself; the platform is the sole issuer.
