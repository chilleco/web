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
COMPOSE_SWARM := infra/compose/prod.yml
DEPLOY_FILE := deploy.yml
STACK_NAME ?= ${PROJECT_NAME}-${ENV_SAFE}
READY_TIMEOUT ?= 180
READY_INTERVAL ?= 5

# Substitute public CI settings only; keep escaped container variables intact.
# envsubst must receive the CI values loaded by Make, not only shell exports.
export PROJECT_NAME REGISTRY IMAGE_TAG RELEASE COMMIT_SHA DATA_PATH PROTOCOL EXTERNAL_HOST
export API_PORT WEB_PORT TG_PORT NAME LOCALE TG_BOT

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

# A newer checkout cannot run its fixes from an older CI image.
.PHONY: check-release
check-release: check-env
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		checkout=$$(git rev-parse HEAD 2>/dev/null || true); \
		if [ -n "$$checkout" ]; then \
			valid=0; \
			case "$$IMAGE_TAG" in \
				$(ENV_SAFE)-?*) release=$${IMAGE_TAG#$(ENV_SAFE)-}; \
					case "$$checkout" in "$$release"*) valid=1 ;; esac ;; \
			esac; \
			if [ "$$valid" != "1" ] || { [ -n "$$COMMIT_SHA" ] && [ "$$COMMIT_SHA" != "$$checkout" ]; }; then \
				echo "CI image tag '$$IMAGE_TAG' does not match checkout $$checkout." >&2; \
				echo "Run the production CI build and deployment for this commit. git pull does not rebuild images or replace the saved deploy.yml." >&2; \
				exit 1; \
			fi; \
		fi; \
	fi

# Reuse a matching CI artifact; recover a missing one atomically from CI settings.
.PHONY: check-deploy
check-deploy: check-release
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		if [ ! -f "$(DEPLOY_FILE)" ]; then \
			missing=0; \
			for key in PROJECT_NAME REGISTRY IMAGE_TAG DATA_PATH PROTOCOL EXTERNAL_HOST API_PORT WEB_PORT TG_PORT; do \
				if [ -z "$$(printenv "$$key")" ]; then \
					echo "Missing CI setting: $$key" >&2; \
					missing=1; \
				fi; \
			done; \
			if [ "$$missing" = "1" ]; then \
				echo "deploy.yml is missing. Run the CI/CD deployment to provision this checkout." >&2; \
				exit 1; \
			fi; \
			command -v envsubst >/dev/null 2>&1 || { echo "envsubst is required (install gettext-base on Ubuntu)." >&2; exit 1; }; \
			manifest=$$(mktemp "$(DEPLOY_FILE).XXXXXX") || exit 1; \
			trap 'rm -f "$$manifest"' 0 1 2 15; \
			ENV=$(ENV_SAFE) envsubst '$${REGISTRY} $${PROJECT_NAME} $${IMAGE_TAG} $${RELEASE} $${DATA_PATH} $${PROTOCOL} $${EXTERNAL_HOST} $${API_PORT} $${WEB_PORT} $${TG_PORT} $${ENV} $${NAME} $${LOCALE} $${TG_BOT}' < "$(COMPOSE_SWARM)" > "$$manifest" || exit 1; \
			docker stack config -c "$$manifest" >/dev/null || exit 1; \
			mv "$$manifest" "$(DEPLOY_FILE)" || exit 1; \
			echo "Generated $(DEPLOY_FILE) from CI settings."; \
		else \
			docker stack config -c "$(DEPLOY_FILE)" >/dev/null || exit 1; \
		fi; \
		if [ -n "$$IMAGE_TAG" ] && [ -n "$$REGISTRY" ]; then \
			images=$$(awk '$$1 == "image:" { gsub(/\042|\047/, "", $$2); print $$2 }' "$(DEPLOY_FILE)"); \
			for image in $$images; do \
				case "$$image" in "$$REGISTRY/$$PROJECT_NAME/"*) \
					case "$$image" in *":$$IMAGE_TAG"|*":$$IMAGE_TAG@sha256:"*) ;; \
						*) echo "deploy.yml contains a different CI image tag. Run the production pipeline to regenerate it." >&2; exit 1 ;; \
					esac ;; \
				esac; \
			done; \
		fi; \
	fi

.PHONY: check
check: check-deploy
	@echo "ENV=$(ENV_SAFE)"
	@if [ -z "$$PROJECT_NAME" ]; then echo "PROJECT_NAME is required." >&2; exit 1; fi
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		state=$$(docker info --format '{{.Swarm.LocalNodeState}} {{.Swarm.ControlAvailable}}') || exit 1; \
		if [ "$$state" != "active true" ]; then \
			echo "A Swarm manager is required. Initialize this VPS with docker swarm init, or run deployment on an existing manager." >&2; \
			exit 1; \
		fi; \
		echo "Swarm manifest valid; manager ready. Use make ready to check running services."; \
	else \
		$(COMPOSE_CMD) config --quiet || exit 1; \
		echo "Compose configuration valid."; \
	fi

# ============================================================================
# Lifecycle
# ============================================================================

# Start services
.PHONY: up
up: check
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		docker stack deploy -c $(DEPLOY_FILE) --with-registry-auth --prune $(STACK_NAME); \
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

# Swarm deploy returns before startup finishes; CI must wait for running replicas.
.PHONY: ready
ready: check-env
	@if [ "$(ENV_SAFE)" != "pre" ] && [ "$(ENV_SAFE)" != "prod" ]; then \
		echo "make ready requires a pre/prod Swarm stack." >&2; exit 1; \
	fi; \
	elapsed=0; \
	while :; do \
		services=$$(docker stack services "$(STACK_NAME)" --format '{{.Name}} {{.Replicas}}') || exit 1; \
		if printf '%s\n' "$$services" | awk 'NF { count++; split($$2, replicas, "/"); if (replicas[1] != replicas[2] || replicas[2] < 1) failed=1 } END { exit (count == 0 || failed) }'; then \
			echo "All Swarm services have their requested running replicas."; exit 0; \
		fi; \
		if [ "$$elapsed" -ge "$(READY_TIMEOUT)" ]; then \
			echo "Swarm services failed to become ready. Inspect make log for startup errors." >&2; \
			printf '%s\n' "$$services"; \
			docker stack ps --no-trunc "$(STACK_NAME)"; exit 1; \
		fi; \
		sleep "$(READY_INTERVAL)"; elapsed=$$((elapsed + $(READY_INTERVAL))); \
	done

.PHONY: tasks
tasks: check-env
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		docker stack ps --no-trunc "$(STACK_NAME)"; \
	else \
		$(COMPOSE_CMD) ps --all; \
	fi

# Probe databases with the deployed container's configuration/network.
.PHONY: check-db
check-db: check-env
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		containers=$$(docker ps --filter status=running --filter label=com.docker.swarm.service.name=$(STACK_NAME)_api --format '{{.ID}}') || exit 1; \
		if [ -z "$$containers" ]; then \
			echo "No API container is running on this node. Run make tasks, or run this check on the node hosting the API." >&2; exit 1; \
		fi; \
		set -- $$containers; \
		docker exec "$$1" python -m services.check_db; \
	else \
		$(COMPOSE_CMD) exec -T api python -m services.check_db; \
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

.PHONY: log logs
log: logs

logs: check-env
	@if [ "$(ENV_SAFE)" = "pre" ] || [ "$(ENV_SAFE)" = "prod" ]; then \
		services=$$(docker service ls -q --filter label=com.docker.stack.namespace=$(STACK_NAME)) || exit 1; \
		pids=""; \
		for svc in $$services; do \
			docker service logs --tail=1000 $$svc & \
			pids="$$pids $$!"; \
		done; \
		failed=0; for pid in $$pids; do wait "$$pid" || failed=1; done; exit "$$failed"; \
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

.PHONY: test-infra
test-infra:
	python3 -B -m unittest discover -s infra/tests -p 'test_*.py'

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
	cd web && corepack pnpm run lint

.PHONY: lint-web-fix
lint-web-fix:
	cd web && corepack pnpm run lint:fix

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
