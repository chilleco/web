from models import Base, Attribute


class Task(Base):
    """
    Reward task definition (stored in Mongo collection `tasks`).

    The UI shows a list of tasks and lets the user "claim" them. The claim flow is:
    - `/tasks/get/` returns task definitions + per-user completion status
    - `/tasks/check/` runs a verify module and, on success, adds `reward` to `UserLocal.balance`
      and appends `task.id` to `UserLocal.tasks` (one-time claim).

    Stored fields:
    - `title`/`data`/`button`: localized dicts (keys are locale codes, e.g. `{"en": "...", "ru": "..."}`).
    - `link`: optional action link. If it contains a literal `'{}'` placeholder, `/tasks/get/` (user mode)
      formats it with `user.social_user` (Telegram user id) so invite/share links can embed the ref id.
    - `icon`: optional FontAwesome icon key (without `fa-` prefix), e.g. `gift`. Older records may still contain
      a full class string like `fa-solid fa-gift`; the admin UI normalizes inputs to the key form.
    - `verify`: key of the verify module under `api/app/verify/<verify>.py`.
      The module must expose `async def check(user_id, params) -> int` and return `3` on success.
    - `params`: dict passed to verify module (examples: `{"chat_id": ...}` for `channel`,
      `{"count": ...}` for `invite`).
    - `reward`: int "inner coins" amount awarded on successful verification.
    - `priority`: higher = earlier in the list (API sorts by priority DESC).
    - `status`: `0` = disabled, `1` = active. NOTE: ConSys strips default values on save, so active tasks
      often have no `status` field stored in DB and are treated as active by default.

    Built-in `Base` fields used by tasks:
    - `created` / `updated`: unix timestamps (seconds).
    - `expired`: unix timestamp (seconds). User mode `/tasks/get/` filters out expired tasks,
      and `/tasks/check/` rejects them.

    colors:
    - green – system
    - violet – our products & networks
    - blue – social & referral
    - orange – monetization & paid

    priorities:
    1000 – initial
    900 – regular system
    800 – our networks
    700 – share & referrals
    650 – upvote us
    600 – partners
    500 – frens & referrals
    """

    _name = "tasks"

    title = Attribute(types=dict)
    data = Attribute(types=dict)
    button = Attribute(types=dict)
    link = Attribute(types=str)
    icon = Attribute(types=str)
    size = Attribute(types=int)
    reward = Attribute(types=int)
    verify = Attribute(types=str)
    params = Attribute(types=dict)
    status = Attribute(types=int, default=1)
    priority = Attribute(types=int, default=0)
    color = Attribute(types=str)
    network = Attribute(types=int)
