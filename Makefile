.PHONY: build up up-build down bootstrap logs health

export DOCKER_BUILDKIT := 1
export COMPOSE_DOCKER_CLI_BUILD := 1

build:
	docker compose build

up:
	docker compose up -d
	@$(MAKE) health

up-build: build
	@$(MAKE) up

down:
	docker compose down

bootstrap:
	curl -fsS -X POST http://localhost:8000/api/v1/data-status/refresh
	@echo "Refresh triggered. Poll: curl http://localhost:8000/api/v1/data-status"

health:
	@echo "Waiting for backend health..."
	@for i in $$(seq 1 30); do \
		if curl -fsS http://localhost:8000/health >/dev/null 2>&1; then \
			echo "Backend is healthy."; \
			exit 0; \
		fi; \
		sleep 2; \
	done; \
	echo "Backend not healthy within 60s. Run: docker compose logs backend"; \
	exit 1

logs:
	docker compose logs -f
