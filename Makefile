ENV_FILE ?= .env
-include $(ENV_FILE)
ENV ?= test

# ============================================================================
# Common
# ============================================================================

# Files
COMPOSE_BASE := infra/compose/base.yml
COMPOSE_ENV := --env-file $(ENV_FILE)
ALLOWED_ENVS := local test dev pre prod
ENV_NORMALIZED := $(shell printf '%s' "$(ENV)" | tr '[:upper:]' '[:lower:]')
ENV_SAFE := $(if $(filter $(ENV_NORMALIZED),$(ALLOWED_ENVS)),$(ENV_NORMALIZED),test)
COMPOSE_APP := infra/compose/$(ENV_SAFE).yml
COMPOSE_CMD := docker compose $(COMPOSE_ENV) -f $(COMPOSE_BASE) -f $(COMPOSE_APP) -p ${PROJECT_NAME}
STACK_NAME ?= ${PROJECT_NAME}-${ENV_SAFE}

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

.PHONY: certs
certs: ## Update Let's Encrypt
	sudo systemctl restart nginx
	sudo certbot --nginx

.PHONY: check-env
check-env:
	@if [ "$(ENV_NORMALIZED)" != "$(ENV_SAFE)" ]; then \
		echo "ENV='$(ENV)' is not recognized. Using ENV='test'."; \
	elif [ "$(ENV)" != "$(ENV_NORMALIZED)" ]; then \
		echo "ENV='$(ENV)' normalized to lowercase: '$(ENV_SAFE)'."; \
	fi

# ============================================================================
# Docker Lifecycle
# ============================================================================

# Start services
.PHONY: up
up: check-env
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		docker stack deploy -c deploy.yml --with-registry-auth --prune $(STACK_NAME); \
	else \
		$(COMPOSE_CMD) up --build; \
	fi

# Stop services
.PHONY: down
down: check-env
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		docker stack rm $(STACK_NAME); \
	else \
		$(COMPOSE_CMD) down; \
	fi

# ============================================================================
# Status and monitoring
# ============================================================================

.PHONY: status
status: check-env
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		docker stack services $(STACK_NAME); \
	else \
		$(COMPOSE_CMD) ps; \
	fi

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
logs: check-env
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		services=$$(docker service ls -q --filter label=com.docker.stack.namespace=$(STACK_NAME)); \
		for svc in $$services; do \
			docker service logs --tail=1000 $$svc & \
		done; \
	else \
		$(COMPOSE_CMD) logs; \
	fi

.PHONY: logs-api
logs-api:
	docker service logs --tail=1000 $(STACK_NAME)_api

.PHONY: logs-worker
logs-worker:
	docker service logs --tail=1000 $(STACK_NAME)_worker

.PHONY: logs-scheduler
logs-scheduler:
	docker service logs --tail=1000 $(STACK_NAME)_scheduler

.PHONY: logs-tg
logs-tg:
	docker service logs --tail=1000 $(STACK_NAME)_tg

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
	@$(MAKE) up ENV=test

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
