# Operations Context

## System Operations

### File Management
- Prefer workspace-relative paths
- Check before destructive operations
- Use appropriate permissions
- Consider backup before modification

### Process Management
- Monitor long-running processes
- Handle signals gracefully
- Clean up on exit
- Log process lifecycle

### Configuration
- Validate before applying
- Keep backups of working config
- Document changes
- Test in safe environment first

## DevOps Practices

### Deployment
- Verify prerequisites
- Follow staging procedures
- Keep rollback plan ready
- Document deployment steps

### Monitoring
- Check service status
- Review logs for errors
- Monitor resource usage
- Alert on anomalies

### Troubleshooting
- Gather context (logs, status, config)
- Isolate issues systematically
- Document findings
- Test fixes before production

## OpenClaw Operations

### Gateway Management
- Use `openclaw status` for diagnostics
- `openclaw logs` for recent activity
- `openclaw restart` when needed
- Config changes via `config.patch`

### Agent Operations
- Session management via tools
- Workspace operations
- Skill management
- Model switching

### Maintenance
- Regular log review
- Disk space monitoring
- Backup procedures
- Update scheduling

## Common Tasks
- Restart services safely
- Update configuration
- Check service health
- Review error logs
- Deploy updates
