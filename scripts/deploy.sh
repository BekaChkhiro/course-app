#!/bin/bash

# =============================================================================
# Deployment Script for E-Learning Platform
# =============================================================================
# This script handles production deployment with zero-downtime updates
# =============================================================================

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${ENVIRONMENT:-production}"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose is not installed"
        exit 1
    fi

    # Check environment file
    if [[ ! -f "${PROJECT_DIR}/.env.production" ]]; then
        error "Production environment file not found: .env.production"
        exit 1
    fi

    log "Prerequisites check passed"
}

# Pre-deployment checks
pre_deploy_checks() {
    log "Running pre-deployment checks..."

    # Check disk space
    local available_space=$(df -BG "$PROJECT_DIR" | awk 'NR==2 {print $4}' | tr -d 'G')
    if [[ $available_space -lt 5 ]]; then
        error "Insufficient disk space: ${available_space}G available, need at least 5G"
        exit 1
    fi

    # Check if database is accessible
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready > /dev/null 2>&1; then
        log "Database connection verified"
    else
        warn "Could not verify database connection (may not be running yet)"
    fi

    log "Pre-deployment checks passed"
}

# Create backup before deployment
create_backup() {
    log "Creating pre-deployment backup..."

    if docker compose -f "$COMPOSE_FILE" ps postgres | grep -q "running"; then
        docker compose -f "$COMPOSE_FILE" exec -T backup /backup.sh backup daily
        log "Backup created successfully"
    else
        warn "Skipping backup - database not running"
    fi
}

# Pull latest images
pull_images() {
    log "Pulling latest images..."
    docker compose -f "$COMPOSE_FILE" pull
    log "Images pulled successfully"
}

# Build images
build_images() {
    log "Building images..."
    docker compose -f "$COMPOSE_FILE" build --no-cache
    log "Images built successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."

    # Start database if not running
    docker compose -f "$COMPOSE_FILE" up -d postgres
    sleep 5

    # Wait for database to be ready
    local max_attempts=30
    local attempt=0
    while ! docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready > /dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error "Database did not become ready in time"
            exit 1
        fi
        log "Waiting for database... ($attempt/$max_attempts)"
        sleep 2
    done

    # Run migrations using the API container
    docker compose -f "$COMPOSE_FILE" run --rm api npx prisma migrate deploy

    log "Migrations completed successfully"
}

# Deploy services with zero-downtime
deploy_services() {
    log "Deploying services..."

    # Update services one at a time for zero-downtime
    local services=("api" "web" "nginx")

    for service in "${services[@]}"; do
        log "Updating $service..."

        # Scale up new container
        docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale "${service}=2" "$service"
        sleep 10

        # Wait for new container to be healthy
        local max_attempts=30
        local attempt=0
        while [[ $(docker compose -f "$COMPOSE_FILE" ps "$service" | grep -c "healthy") -lt 1 ]]; do
            attempt=$((attempt + 1))
            if [[ $attempt -ge $max_attempts ]]; then
                error "New $service container did not become healthy"
                rollback
                exit 1
            fi
            log "Waiting for $service to be healthy... ($attempt/$max_attempts)"
            sleep 5
        done

        # Scale down to single container
        docker compose -f "$COMPOSE_FILE" up -d --no-deps --scale "${service}=1" "$service"
        log "$service updated successfully"
    done

    log "All services deployed successfully"
}

# Rollback to previous version
rollback() {
    warn "Rolling back to previous version..."

    # Get previous image tags
    docker compose -f "$COMPOSE_FILE" down

    # Restore from backup if needed
    # ./backup.sh restore /backup/daily/latest.sql.gz

    error "Rollback completed. Please investigate the issue."
}

# Post-deployment verification
post_deploy_verify() {
    log "Running post-deployment verification..."

    # Check health endpoints
    local max_attempts=10
    local attempt=0

    while ! curl -sf http://localhost/health > /dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [[ $attempt -ge $max_attempts ]]; then
            error "Health check failed after deployment"
            return 1
        fi
        log "Waiting for health endpoint... ($attempt/$max_attempts)"
        sleep 5
    done

    log "Health check passed"

    # Check API response
    local api_response=$(curl -sf http://localhost/api || echo "")
    if [[ -z "$api_response" ]]; then
        error "API is not responding"
        return 1
    fi
    log "API responding correctly"

    # Check web frontend
    local web_response=$(curl -sf http://localhost || echo "")
    if [[ -z "$web_response" ]]; then
        error "Web frontend is not responding"
        return 1
    fi
    log "Web frontend responding correctly"

    log "Post-deployment verification passed"
}

# Cleanup old images
cleanup() {
    log "Cleaning up old resources..."
    docker system prune -f --volumes --filter "until=24h"
    log "Cleanup completed"
}

# Full deployment
deploy() {
    log "Starting deployment to $ENVIRONMENT..."
    local start_time=$(date +%s)

    check_prerequisites
    pre_deploy_checks
    create_backup
    pull_images
    run_migrations
    deploy_services
    post_deploy_verify
    cleanup

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log "Deployment completed successfully in ${duration} seconds"
}

# Quick deploy (skip backup and checks)
quick_deploy() {
    log "Starting quick deployment..."
    docker compose -f "$COMPOSE_FILE" up -d --build
    post_deploy_verify
    log "Quick deployment completed"
}

# Stop all services
stop() {
    log "Stopping all services..."
    docker compose -f "$COMPOSE_FILE" down
    log "Services stopped"
}

# View logs
logs() {
    local service="${1:-}"
    if [[ -n "$service" ]]; then
        docker compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        docker compose -f "$COMPOSE_FILE" logs -f
    fi
}

# Show status
status() {
    docker compose -f "$COMPOSE_FILE" ps
}

# Main
main() {
    cd "$PROJECT_DIR"

    # Load environment variables
    if [[ -f ".env.production" ]]; then
        export $(grep -v '^#' .env.production | xargs)
    fi

    local command="${1:-deploy}"

    case $command in
        deploy)
            deploy
            ;;
        quick)
            quick_deploy
            ;;
        stop)
            stop
            ;;
        logs)
            logs "${2:-}"
            ;;
        status)
            status
            ;;
        rollback)
            rollback
            ;;
        migrate)
            run_migrations
            ;;
        backup)
            create_backup
            ;;
        *)
            echo "Usage: $0 {deploy|quick|stop|logs [service]|status|rollback|migrate|backup}"
            exit 1
            ;;
    esac
}

main "$@"
