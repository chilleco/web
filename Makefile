include .env

# ============================================================================
# Common
# ============================================================================

ENV_LC := $(shell echo "$(MODE)" | tr A-Z a-z)
STACK_NAME ?= $(PROJECT_NAME)-$(ENV_LC)
IMAGE_TAG ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo latest)
SECRETS_VERSION ?= $(IMAGE_TAG)

# Files
COMPOSE_BASE := infra/compose/$(COMPOSE_BASE)
COMPOSE_APP := infra/compose/$(ENV_LC).yml
# FIXME: rm, use COMPOSE_APP
COMPOSE_LOCAL := infra/compose/local.yml
COMPOSE_TEST := infra/compose/test.yml
COMPOSE_DEV := infra/compose/dev.yml
COMPOSE_PROD := infra/compose/prod.yml

# ============================================================================
# Actions & Pipeline
# ============================================================================

release:
	git checkout dev
	git pull
	git checkout main
	git merge dev
	git push origin main
	git checkout dev

# ============================================================================
# Docker Lifecycle
# ============================================================================

# Start services
up:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_LOCAL) -p ${PROJECT_NAME} up --build

up-dev:
	sudo docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) -p ${PROJECT_NAME} up --build

# up-prod:
# 	sudo docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) -p ${PROJECT_NAME} up --build -d

up-test:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_TEST) -p ${PROJECT_NAME} up --build

# Stop services
down:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_LOCAL) -p ${PROJECT_NAME} down

down-dev:
	sudo docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) -p ${PROJECT_NAME} down

# down-prod:
# 	sudo docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) -p ${PROJECT_NAME} down

down-test:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_TEST) -p ${PROJECT_NAME} down

# ============================================================================
# Status and monitoring
# ============================================================================

status:
	sudo docker ps --filter name="^${PROJECT_NAME}" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# ============================================================================
# Logs
# ============================================================================

# logs:
# 	sudo docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_PROD) logs

logs-dev:
	sudo docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) logs

logs-local:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_LOCAL) logs

logs-api:
	tail -f ${DATA_PATH}/logs/api.log

logs-worker:
	tail -f ${DATA_PATH}/logs/worker.log

logs-scheduler:
	tail -f ${DATA_PATH}/logs/scheduler.log

logs-tg:
	tail -f ${DATA_PATH}/logs/tg.log

logs-web:
	docker service logs -f ${PROJECT_NAME}_web

# ============================================================================
# Development tools
# ============================================================================

shell:
	sudo docker exec -it `sudo docker ps -a --filter name="^${PROJECT_NAME}.*api" --format "{{.ID}}" | head -n 1` bash

python:
	sudo docker exec -it `sudo docker ps -a --filter name="^${PROJECT_NAME}.*api" --format "{{.ID}}" | head -n 1` python

script:
	sudo docker exec -it `sudo docker ps -a --filter name="^${PROJECT_NAME}.*api" --format "{{.ID}}" | head -n 1` python -m scripts.$(name)

set:
	sudo chmod 0755 ~
	sudo chmod -R a+w ~/data/
	sudo chmod 0700 ~/.ssh
	sudo chmod -R 0600 ~/.ssh/*
	export EXTERNAL_HOST=${EXTERNAL_HOST} WEB_PORT=${WEB_PORT} API_PORT=${API_PORT} TG_PORT=${TG_PORT} DATA_PATH=${DATA_PATH}; \
	envsubst '$${EXTERNAL_HOST} $${WEB_PORT} $${API_PORT} $${TG_PORT} $${DATA_PATH}' < infra/nginx/prod.conf | sudo tee /etc/nginx/sites-enabled/${PROJECT_NAME}.conf > /dev/null
	sudo systemctl restart nginx
	sudo certbot --nginx

# ============================================================================
# Tests & Linter
# ============================================================================

test: # FIXME
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_TEST) -p ${PROJECT_NAME} up --build

lint-api:
	find . -type f -name '*.py' \
	| grep -vE 'env/' \
	| grep -vE 'tests/' \
	| grep -vE 'usr/' \
	| grep -vE 'etc/' \
	| xargs pylint -f text \
		--rcfile=tests/.pylintrc \
		--msg-template='{path}:{line}:{column}: [{symbol}] {msg}'

lint-web:
	cd web && npm run lint

lint-web-fix:
	cd web && npm run lint:fix

unit-test:
	pytest -s tests/

unit-test-changed:
	git status -s \
	| grep 'tests/.*\.py$$' \
	| awk '{print $$1,$$2}' \
	| grep -i '^[ma]' \
	| awk '{print $$2}' \
	| xargs pytest -s

# ============================================================================
# Cleanup
# ============================================================================

clean-venv:
	rm -rf env/
	rm -rf **/env/
	rm -rf __pycache__/
	rm -rf **/__pycache__/
	rm -rf .pytest_cache/
	rm -rf **/.pytest_cache/

clean-logs:
	rm -rf ${DATA_PATH}/logs/
	mkdir ${DATA_PATH}/logs/
	touch ${DATA_PATH}/logs/worker.log ${DATA_PATH}/logs/worker.err ${DATA_PATH}/logs/scheduler.log ${DATA_PATH}/logs/scheduler.err ${DATA_PATH}/logs/api.log ${DATA_PATH}/logs/api.err ${DATA_PATH}/logs/tg.err ${DATA_PATH}/logs/tg.log ${DATA_PATH}/logs/nginx.log ${DATA_PATH}/logs/nginx.err ${DATA_PATH}/logs/mongodb.log

clean:
	make clean-venv
	make clean-logs
