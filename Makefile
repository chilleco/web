include .env

#
release:
	git checkout dev
	git pull
	git checkout main
	git merge dev
	git push origin main
	git checkout dev

# Start services
up:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.local.yml -p ${PROJECT_NAME} up --build

up-dev:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.dev.yml -p ${PROJECT_NAME} up --build

up-prod:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.prod.yml -p ${PROJECT_NAME} up --build -d

up-test:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.test.yml -p ${PROJECT_NAME} up --build

# Stop services
down:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.local.yml -p ${PROJECT_NAME} down

down-dev:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.dev.yml -p ${PROJECT_NAME} down

down-prod:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.prod.yml -p ${PROJECT_NAME} down

down-test:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.test.yml -p ${PROJECT_NAME} down

# Status and monitoring
status:
	docker ps --filter name="^${PROJECT_NAME}" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# Logs
logs:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.prod.yml logs

logs-dev:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.dev.yml logs

logs-local:
	cd infra/compose && docker compose --env-file ../../.env -f compose.yml -f compose.local.yml logs

logs-base:
	cd infra/compose && docker compose --env-file ../../.env -f compose.base.yml logs

logs-api:
	tail -f ${DATA_PATH}/logs/api.log

logs-jobs:
	tail -f ${DATA_PATH}/logs/jobs.log

logs-tg:
	tail -f ${DATA_PATH}/logs/tg.log

logs-web:
	docker service logs -f ${PROJECT_NAME}_web

# Development tools
shell:
	docker exec -it `docker ps -a | grep ${PROJECT_NAME}-api | cut -d ' ' -f 1` bash

python:
	docker exec -it `docker ps -a | grep ${PROJECT_NAME}-api | cut -d ' ' -f 1` python

script:
	docker exec -it `docker ps -a | grep ${PROJECT_NAME}-api | cut -d ' ' -f 1` python -m scripts.$(name)

set:
	sudo chmod 0755 ~
	sudo chmod -R a+w ~/data/
	sudo chmod 0700 ~/.ssh
	sudo chmod -R 0600 ~/.ssh/*
	export EXTERNAL_HOST=${EXTERNAL_HOST} WEB_PORT=${WEB_PORT} API_PORT=${API_PORT} TG_PORT=${TG_PORT} DATA_PATH=${DATA_PATH} PROMETHEUS_PORT=${PROMETHEUS_PORT} GRAFANA_PORT=${GRAFANA_PORT}; \
	envsubst '$${EXTERNAL_HOST} $${WEB_PORT} $${API_PORT} $${TG_PORT} $${DATA_PATH} $${PROMETHEUS_PORT} $${GRAFANA_PORT}' < infra/nginx/prod.conf > /etc/nginx/sites-enabled/${PROJECT_NAME}.conf
	sudo systemctl restart nginx
	sudo certbot --nginx

# Run tests
test:
	cd infra/compose && docker compose --env-file ../../.env -f compose.test-api.yml -p ${PROJECT_NAME} up --build --exit-code-from test
	cd infra/compose && docker compose --env-file ../../.env -f compose.test-web.yml -p ${PROJECT_NAME} up --build --exit-code-from test

test-api:
	cd infra/compose && docker compose --env-file ../../.env -f compose.test-api.yml -p ${PROJECT_NAME} up --build --exit-code-from test

test-web:
	cd infra/compose && docker compose --env-file ../../.env -f compose.test-web.yml -p ${PROJECT_NAME} up --build --exit-code-from test

lint:
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

# Cleanup
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
	touch ${DATA_PATH}/logs/jobs.log ${DATA_PATH}/logs/jobs.err ${DATA_PATH}/logs/api.log ${DATA_PATH}/logs/api.err ${DATA_PATH}/logs/tg.err ${DATA_PATH}/logs/tg.log ${DATA_PATH}/logs/nginx.log ${DATA_PATH}/logs/nginx.err ${DATA_PATH}/logs/mongodb.log

clean:
	make clean-venv
	make clean-logs
