# Template Web App
Modern full-stack web application with Python FastAPI backend, Next.js frontend, Telegram bot, and Telegram / VK / MAX Mini App support. Built with Docker containers and featuring multilingual support, and production-ready flow.

## Background tasks (Taskiq)
- Worker: `uv run taskiq worker tasks.broker:broker tasks.registry`
- Scheduler: `uv run taskiq scheduler tasks.scheduler:scheduler tasks.registry`
- Fixed-delay periodic jobs (cycle after finish): trigger once, e.g. `await run_periodic.kiq("cache_categories")`

## Observability
- Sentry: set `SENTRY_DSN` (optional: `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_PROFILES_SAMPLE_RATE`, `SENTRY_SEND_DEFAULT_PII`).
- Logging (Swarm): containers log JSON to stdout/stderr only (no files). Required fields: `service`, `env`, `version`, `level`, `trace_id`/`request_id`, `msg`, `error.stack` (if present). Use labels only for low-cardinality values (service, stack, env, node, level); keep `request_id`, `user_id`, `ip`, `url` in JSON fields.

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
                1. Configure <code> .env </code> from <code> base.env </code> and add:
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
                1. Configure <code> .env </code> from <code> base.env </code> and add:
                <pre>
\# Type
\# local / test / dev / pre / prod
ENV=prod

\# Links
PROTOCOL=https
EXTERNAL_HOST=web.chill.services
WEB_PORT=8201
API_PORT=8202
TG_PORT=8203
REDIS_PORT=8204
DATA_PATH=~/data/web
                </pre>
            </td>
        </tr>
        <tr>
            <td>
                2. <code> make dev </code>
            </td>
            <td>
                2. <code> make run </code>
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

## Telegram bot (webhooks)
- Service lives in `tg/` and runs a FastAPI webhook handler behind `/tg/`.
- Required env: `TG_TOKEN` (bot token) and `TG` (public webhook URL like `https://host/tg/`).
- Optional env: `TG_SECRET` (webhook secret header).
- `/start` payload is treated as `utm` and forwarded to auth; the bot replies with a WebApp button to open the Mini App.
- Bot message localization lives in `tg/messages/*.json` (en/ru/zh/es/ar).
