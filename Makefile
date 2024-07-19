include .env

dev:
	docker compose -p ${PROJECT_NAME} up --build

run:
	docker compose -f compose.prod.yml -p ${PROJECT_NAME} up --build -d

stop:
	docker compose -f compose.prod.yml -p ${PROJECT_NAME} stop

check:
	docker ps --filter name="^${PROJECT_NAME}" --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

run-test:
	docker compose -f tests/compose.api.yml -p ${PROJECT_NAME} up --build --exit-code-from test
	docker compose -f tests/compose.web.yml -p ${PROJECT_NAME} up --build --exit-code-from test

log:
	docker compose -f compose.prod.yml logs

log-api:
	tail -f ${DATA_PATH}/logs/api.log

log-jobs:
	tail -f ${DATA_PATH}/logs/jobs.log

log-web:
	docker service logs -f ${PROJECT_NAME}_web

log-tg:
	tail -f ${DATA_PATH}/logs/tg.log

connect:
	docker exec -it `docker ps -a | grep ${PROJECT_NAME}-api | cut -d ' ' -f 1` bash

script:
	docker exec -it `docker ps -a | grep ${PROJECT_NAME}-api | cut -d ' ' -f 1` python -m scripts.$(name)

release:
	git checkout dev
	git pull
	git checkout main
	git merge dev
	git push
	git checkout dev

# TODO: turn tg on
test-lint-all:
	find . -type f -name '*.py' \
	| grep -vE 'env/' \
	| grep -vE 'tests/' \
	| grep -vE 'tg/' \
	| grep -vE 'web/' \
	| xargs pylint -f text \
		--rcfile=tests/.pylintrc \
		--msg-template='{path}:{line}:{column}: [{symbol}] {msg}'

# TODO: turn tg on
test-lint:
	git status -s \
	| grep -vE 'tests/' \
	| grep -vE 'tg/' \
	| grep -vE 'web/' \
	| grep '\.py$$' \
	| awk '{print $$1,$$2}' \
	| grep -i '^[ma]' \
	| awk '{print $$2}' \
	| xargs pylint -f text \
		--rcfile=tests/.pylintrc \
		--msg-template='{path}:{line}:{column}: [{symbol}] {msg}'

test-unit-all:
	pytest -s tests/

test-unit:
	git status -s \
	| grep 'tests/.*\.py$$' \
	| awk '{print $$1,$$2}' \
	| grep -i '^[ma]' \
	| awk '{print $$2}' \
	| xargs pytest -s

test:
	make test-lint-all
	make test-unit-all

clear:
	rm -rf env/
	rm -rf **/env/
	rm -rf __pycache__/
	rm -rf **/__pycache__/
	rm -rf .pytest_cache/
	rm -rf **/.pytest_cache/

clear-logs:
	rm -rf ${DATA_PATH}/logs/
	mkdir ${DATA_PATH}/logs/
	touch ${DATA_PATH}/logs/jobs.log ${DATA_PATH}/logs/jobs.err ${DATA_PATH}/logs/api.log ${DATA_PATH}/logs/api.err ${DATA_PATH}/logs/tg.err ${DATA_PATH}/logs/tg.log ${DATA_PATH}/logs/nginx.log ${DATA_PATH}/logs/nginx.err ${DATA_PATH}/logs/mongodb.log

clear-all:
	make clear
	make clear-logs

set:
	sudo chmod 0755 ~
	sudo chmod -R a+w ~/data/
	sudo chmod 0700 ~/.ssh
	sudo chmod -R 0600 ~/.ssh/*
	export EXTERNAL_HOST=${EXTERNAL_HOST} WEB_PORT=${WEB_PORT} API_PORT=${API_PORT} TG_PORT=${TG_PORT} DATA_PATH=${DATA_PATH}; \
	envsubst '$${EXTERNAL_HOST} $${WEB_PORT} $${API_PORT} $${TG_PORT} $${DATA_PATH}' < configs/nginx.prod.conf > /etc/nginx/sites-enabled/${PROJECT_NAME}.conf
	sudo systemctl restart nginx
	sudo certbot --nginx
