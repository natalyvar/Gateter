.DEFAULT_GOAL := help
COMPOSE := docker compose

.PHONY: help up down logs test lint superuser shell reset

help: ## Muestra esta ayuda
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Construye y levanta toda la app en http://localhost:8080
	$(COMPOSE) up --build -d
	@echo "Gateter corriendo en http://localhost:$${APP_PORT:-8080}"

down: ## Detiene los contenedores
	$(COMPOSE) down

logs: ## Sigue los logs de todos los servicios
	$(COMPOSE) logs -f

test: ## Ejecuta los tests del backend contra PostgreSQL
	$(COMPOSE) run --rm --no-deps -e DJANGO_MIGRATE_ON_START=0 backend python manage.py test --noinput

superuser: ## Crea un superusuario para /admin
	$(COMPOSE) exec backend python manage.py createsuperuser

shell: ## Abre la shell de Django
	$(COMPOSE) exec backend python manage.py shell

reset: ## Borra contenedores Y datos (volumen de PostgreSQL)
	$(COMPOSE) down -v
