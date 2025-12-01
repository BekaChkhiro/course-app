#!/bin/bash

# =============================================================================
# Database Backup Script for E-Learning Platform
# =============================================================================
# This script creates automated backups of the PostgreSQL database
# It supports daily, weekly, and monthly retention policies
# =============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup}"
PGHOST="${PGHOST:-postgres}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE="${PGDATABASE:-course_platform}"
RETENTION_DAYS=${RETENTION_DAYS:-7}
RETENTION_WEEKS=${RETENTION_WEEKS:-4}
RETENTION_MONTHS=${RETENTION_MONTHS:-12}

# S3/R2 Configuration (optional)
S3_BUCKET="${S3_BUCKET:-}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# Slack/Discord Webhook (optional)
WEBHOOK_URL="${WEBHOOK_URL:-}"

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

notify() {
    local message="$1"
    local status="${2:-info}"

    if [[ -n "$WEBHOOK_URL" ]]; then
        local color=""
        case $status in
            success) color="good" ;;
            error) color="danger" ;;
            *) color="warning" ;;
        esac

        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$message\", \"color\": \"$color\"}" || true
    fi
}

# Create backup directory structure
setup_directories() {
    mkdir -p "$BACKUP_DIR/daily"
    mkdir -p "$BACKUP_DIR/weekly"
    mkdir -p "$BACKUP_DIR/monthly"
    log "Backup directories verified"
}

# Create database backup
create_backup() {
    local backup_type="$1"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local filename="${PGDATABASE}_${backup_type}_${timestamp}.sql.gz"
    local filepath="$BACKUP_DIR/$backup_type/$filename"

    log "Creating $backup_type backup: $filename"

    # Create backup with compression
    PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$PGHOST" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        --format=plain \
        | gzip -9 > "$filepath"

    local size=$(du -h "$filepath" | cut -f1)
    log "Backup created: $filepath ($size)"

    # Verify backup integrity
    if gzip -t "$filepath" 2>/dev/null; then
        log "Backup integrity verified"
    else
        error "Backup integrity check failed"
        rm -f "$filepath"
        return 1
    fi

    # Upload to S3/R2 if configured
    if [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3 "$filepath" "$backup_type/$filename"
    fi

    echo "$filepath"
}

# Upload backup to S3/R2
upload_to_s3() {
    local local_path="$1"
    local remote_path="$2"

    log "Uploading to S3: $remote_path"

    local endpoint_url=""
    if [[ -n "$S3_ENDPOINT" ]]; then
        endpoint_url="--endpoint-url $S3_ENDPOINT"
    fi

    aws s3 cp "$local_path" "s3://$S3_BUCKET/$remote_path" $endpoint_url

    if [[ $? -eq 0 ]]; then
        log "Upload successful"
    else
        error "Upload failed"
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups..."

    # Daily backups - keep for RETENTION_DAYS
    find "$BACKUP_DIR/daily" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

    # Weekly backups - keep for RETENTION_WEEKS weeks
    find "$BACKUP_DIR/weekly" -name "*.sql.gz" -mtime +$((RETENTION_WEEKS * 7)) -delete

    # Monthly backups - keep for RETENTION_MONTHS months
    find "$BACKUP_DIR/monthly" -name "*.sql.gz" -mtime +$((RETENTION_MONTHS * 30)) -delete

    log "Cleanup completed"
}

# Restore from backup
restore_backup() {
    local backup_file="$1"

    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        return 1
    fi

    log "Restoring from backup: $backup_file"
    log "WARNING: This will drop and recreate all database objects!"

    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [[ "$confirm" != "yes" ]]; then
        log "Restore cancelled"
        return 0
    fi

    # Restore from backup
    gunzip -c "$backup_file" | PGPASSWORD="$PGPASSWORD" psql \
        -h "$PGHOST" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        --quiet

    if [[ $? -eq 0 ]]; then
        log "Restore completed successfully"
    else
        error "Restore failed"
        return 1
    fi
}

# List available backups
list_backups() {
    echo "=== Available Backups ==="
    echo ""
    echo "Daily backups:"
    ls -lh "$BACKUP_DIR/daily"/*.sql.gz 2>/dev/null || echo "  No daily backups"
    echo ""
    echo "Weekly backups:"
    ls -lh "$BACKUP_DIR/weekly"/*.sql.gz 2>/dev/null || echo "  No weekly backups"
    echo ""
    echo "Monthly backups:"
    ls -lh "$BACKUP_DIR/monthly"/*.sql.gz 2>/dev/null || echo "  No monthly backups"
}

# Health check - verify backup system
health_check() {
    log "Running backup health check..."

    # Check database connection
    if PGPASSWORD="$PGPASSWORD" pg_isready -h "$PGHOST" -U "$PGUSER" -d "$PGDATABASE" > /dev/null 2>&1; then
        log "Database connection: OK"
    else
        error "Database connection: FAILED"
        return 1
    fi

    # Check backup directory
    if [[ -d "$BACKUP_DIR" && -w "$BACKUP_DIR" ]]; then
        log "Backup directory: OK"
    else
        error "Backup directory: NOT WRITABLE"
        return 1
    fi

    # Check disk space
    local available=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $4}')
    log "Available disk space: $available"

    # Count backups
    local daily_count=$(ls "$BACKUP_DIR/daily"/*.sql.gz 2>/dev/null | wc -l)
    local weekly_count=$(ls "$BACKUP_DIR/weekly"/*.sql.gz 2>/dev/null | wc -l)
    local monthly_count=$(ls "$BACKUP_DIR/monthly"/*.sql.gz 2>/dev/null | wc -l)

    log "Backup counts - Daily: $daily_count, Weekly: $weekly_count, Monthly: $monthly_count"

    # Check last backup age
    local latest=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -d' ' -f2)
    if [[ -n "$latest" ]]; then
        local age=$(($(date +%s) - $(stat -c %Y "$latest")))
        local hours=$((age / 3600))
        log "Last backup age: ${hours} hours"

        if [[ $hours -gt 25 ]]; then
            error "Last backup is more than 25 hours old!"
            return 1
        fi
    else
        error "No backups found!"
        return 1
    fi

    log "Health check passed"
    return 0
}

# Main execution
main() {
    local command="${1:-backup}"

    setup_directories

    case $command in
        backup)
            local backup_type="${2:-daily}"
            local filepath=$(create_backup "$backup_type")
            cleanup_old_backups
            notify "Backup completed: $filepath" "success"
            ;;
        restore)
            local backup_file="$2"
            restore_backup "$backup_file"
            ;;
        list)
            list_backups
            ;;
        health)
            health_check
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        *)
            echo "Usage: $0 {backup [daily|weekly|monthly]|restore <file>|list|health|cleanup}"
            exit 1
            ;;
    esac
}

main "$@"
