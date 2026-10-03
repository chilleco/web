# Launchpad Template
Reusable full-stack launch template with Python FastAPI backend, Next.js frontend, Telegram bot, and Telegram / VK / MAX Mini App support. Built with Docker containers, multilingual routing, and production-ready flows.

Reference pages and shared template surfaces should stay honest: ship only real links and real actions, or render disabled localized states until the backend contract is wired.

## Background tasks (Taskiq)
- Worker: `uv run taskiq worker tasks.broker:broker tasks.registry`
- Scheduler: `uv run taskiq scheduler tasks.scheduler:scheduler tasks.registry`
- Fixed-delay periodic jobs (cycle after finish): trigger once, e.g. `await run_periodic.kiq("cache_categories")`

## Observability
- Sentry (API/TG): set `SENTRY_DSN` (optional: `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_SEND_DEFAULT_PII`).
- Sentry (Web): set `NEXT_PUBLIC_SENTRY_DSN` (and optionally `NEXT_PUBLIC_SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NEXT_PUBLIC_SENTRY_PROFILES_SAMPLE_RATE`).
- Logging (Swarm): containers log JSON to stdout/stderr only (no files). Required fields: `service`, `env`, `version`, `level`, `trace_id`/`request_id`, `msg`, `error.stack` (if present). Use labels only for low-cardinality values (service, stack, env, node, level); keep `request_id`, `user_id`, `ip`, `url` in JSON fields.
- API/TG logging path is unified via Loguru: the same log records feed JSON stdout (Alloy -> Loki -> Grafana), errors/critical events to Sentry, and Telegram alerts when `silent=False` (default for `log.important(...)`).

## Run
[Before starting, you can learn how to configure the server →](https://github.com/kosyachniy/dev/blob/main/server/SERVER.md)

<table>
    <thead>
        <tr>
            <th>local</th>
            <th>prod</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td valign="top">
                1. Configure <code> .env </code> from <code> .env.example </code> and add:
                <pre>
# Type
# local / test / dev / pre / prod
ENV=local<br />

\# Links
PROTOCOL=http
EXTERNAL_HOST=localhost
EXTERNAL_PORT=80
DATA_PATH=./data
                </pre>
            </td>
            <td valign="top">
                1. Configure CI/CD variables/secrets (GitHub Actions vars+secrets or GitLab CI/CD variables).
                Fill all keys from <code>.env.example</code> in CI variables/secrets.
            </td>
        </tr>
        <tr>
            <td>
                2. <code> make up </code>
            </td>
            <td>
                2. <code> make release </code>
            </td>
        </tr>
        <tr>
            <td>
                3. Open ` http://localhost/ `
            </td>
            <td>
                3. Open ` https://web.chill.services/ ` (your link)
            </td>
        </tr>
    </tbody>
</table>

Use `make down` to stop services.

Run `make check` before starting: it validates the selected configuration and, for `pre`/`prod`, requires a Swarm manager. CI provisions the runtime environment and `deploy.yml`. If the manifest is missing but the CI settings are available, `make check` and `make up` regenerate it; otherwise they report the missing setting names. Checking out a branch or running `git pull` does not run the production pipeline. It runs on pushes to `main` or through **Run workflow** in GitHub Actions, where you can select the branch to deploy once this workflow is available on the default branch.

## Telegram bot (webhooks)
- Service lives in `tg/` and runs a FastAPI webhook handler behind `/tg/`.
- Required env: `TG_TOKEN` (bot token) and `TG` (public webhook URL like `https://host/tg/`).
- Optional env: `TG_SECRET` (webhook secret header).
- `/start` payload is treated as `utm` and forwarded to auth; the bot replies with a WebApp button to open the Mini App.
- Bot message localization lives in `tg/messages/*.json` (en/ru/zh/es/ar).
