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
# Deployment
# ============================================================================

.PHONY: release
release:
	git checkout dev
	git pull
	git checkout main
	git merge dev
	git push origin main
	git checkout dev

.PHONY: set
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
# Docker Lifecycle
# ============================================================================

# Start services
.PHONY: up
up:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_LOCAL) -p ${PROJECT_NAME} up --build

.PHONY: up-dev
up-dev:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) -p ${PROJECT_NAME} up --build

.PHONY: up-prod
up-prod:
	docker stack deploy -c deploy.yml --with-registry-auth --prune $(STACK_NAME)

.PHONY: up-test
up-test:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_TEST) -p ${PROJECT_NAME} up --build

# Stop services
.PHONY: down
down:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_LOCAL) -p ${PROJECT_NAME} down

.PHONY: down-dev
down-dev:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) -p ${PROJECT_NAME} down

.PHONY: down-prod
down-prod:
	docker stack rm $(STACK_NAME)

.PHONY: down-test
down-test:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_TEST) -p ${PROJECT_NAME} down

# ============================================================================
# Status and monitoring
# ============================================================================

.PHONY: status
status:
	docker stack services ${STACK_NAME}

.PHONY: ps
ps:
	docker ps --filter name="^${PROJECT_NAME}" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

.PHONY: stats
stats:
	docker stats --no-stream $$(docker ps -q --filter label=com.docker.stack.namespace=$(STACK_NAME))

# ============================================================================
# Logs
# ============================================================================

.PHONY: logs
logs:
	@services=$$(docker service ls -q --filter label=com.docker.stack.namespace=$(STACK_NAME)); \
	for svc in $$services; do \
		docker service logs --tail=1000 $$svc & \
	done;

.PHONY: logs-dev
logs-dev:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_DEV) logs

.PHONY: logs-local
logs-local:
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_LOCAL) logs

.PHONY: logs-api
logs-api:
	docker service logs --tail=1000 $(STACK_NAME)_api
# 	tail -f ${DATA_PATH}/logs/api.log

.PHONY: logs-worker
logs-worker:
	docker service logs --tail=1000 $(STACK_NAME)_worker
# 	tail -f ${DATA_PATH}/logs/worker.log

.PHONY: logs-scheduler
logs-scheduler:
	docker service logs --tail=1000 $(STACK_NAME)_scheduler
# 	tail -f ${DATA_PATH}/logs/scheduler.log

.PHONY: logs-tg
logs-tg:
	docker service logs --tail=1000 $(STACK_NAME)_tg
# 	tail -f ${DATA_PATH}/logs/tg.log

.PHONY: logs-web
logs-web:
	docker service logs --tail=1000 $(STACK_NAME)_web

# ============================================================================
# Development tools
# ============================================================================

.PHONY: shell
shell:
	docker exec -it `docker ps -a --filter name="^${PROJECT_NAME}.*api" --format "{{.ID}}" | head -n 1` bash

.PHONY: python
python:
	docker exec -it `docker ps -a --filter name="^${PROJECT_NAME}.*api" --format "{{.ID}}" | head -n 1` python

.PHONY: script
script:
	docker exec -it `docker ps -a --filter name="^${PROJECT_NAME}.*api" --format "{{.ID}}" | head -n 1` python -m scripts.$(name)

.PHONY: reqs
reqs:
	sudo tail -n 100 -f /var/log/nginx/access.log

# ============================================================================
# Tests & Linter
# ============================================================================

.PHONY: test
test: # FIXME
	docker compose -f $(COMPOSE_BASE) -f $(COMPOSE_TEST) -p ${PROJECT_NAME} up --build

.PHONY: lint-api
lint-api:
	find . -type f -name '*.py' \
	| grep -vE 'env/' \
	| grep -vE 'tests/' \
	| grep -vE 'usr/' \
	| grep -vE 'etc/' \
	| xargs pylint -f text \
		--rcfile=tests/.pylintrc \
		--msg-template='{path}:{line}:{column}: [{symbol}] {msg}'

.PHONY: lint-web
lint-web:
	cd web && npm run lint

.PHONY: lint-web-fix
lint-web-fix:
	cd web && npm run lint:fix

.PHONY: unit-test
unit-test:
	pytest -s tests/

.PHONY: unit-test-changed
unit-test-changed:
	git status -s \
	| grep 'tests/.*\.py$$' \
	| awk '{print $$1,$$2}' \
	| grep -i '^[ma]' \
	| awk '{print $$2}' \
	| xargs pytest -s

# ============================================================================
# Backup
# ============================================================================

# .PHONY: db-backup
# db-backup:

# .PHONY: db-restore
# db-restore:

# .PHONY: mq-backup
# mq-backup:

# .PHONY: mq-restore
# mq-restore:

# ============================================================================
# Cleanup
# ============================================================================

.PHONY: clean-venv
clean-venv:
	rm -rf env/
	rm -rf **/env/
	rm -rf __pycache__/
	rm -rf **/__pycache__/
	rm -rf .pytest_cache/
	rm -rf **/.pytest_cache/

.PHONY: clean-logs
clean-logs:
	rm -rf ${DATA_PATH}/logs/
	mkdir ${DATA_PATH}/logs/
	touch ${DATA_PATH}/logs/worker.log ${DATA_PATH}/logs/worker.err ${DATA_PATH}/logs/scheduler.log ${DATA_PATH}/logs/scheduler.err ${DATA_PATH}/logs/api.log ${DATA_PATH}/logs/api.err ${DATA_PATH}/logs/tg.err ${DATA_PATH}/logs/tg.log ${DATA_PATH}/logs/nginx.log ${DATA_PATH}/logs/nginx.err ${DATA_PATH}/logs/mongodb.log

.PHONY: clean
clean:
	make clean-venv
	make clean-logs

.PHONY: prune
prune:
	yes | docker system prune -a

.PHONY: prune-volume
prune-volume:
	yes | docker volume prune -a
