# Coding Context

## Code Style Guidelines

### General Principles
- Write clear, maintainable code
- Add comments for complex logic
- Use meaningful variable names
- Prefer readability over cleverness

### JavaScript/Node.js
- Use `const` by default, `let` when needed
- Prefer async/await over callbacks
- Handle errors explicitly
- Add JSDoc comments for functions

### Python
- Type hints when beneficial
- Docstrings for public APIs
- Follow PEP 8 style guide
- Use dataclasses for structured data

### Error Handling
- Fail gracefully with informative messages
- Log errors for debugging
- Clean up resources (close files, connections)
- Don't swallow exceptions silently

## Testing
- Write tests for critical logic
- Use safe test fixtures (non-executable)
- Test edge cases and error conditions
- Document test setup requirements

## Security
- Validate inputs
- Sanitize outputs
- Avoid injection vulnerabilities
- Use secure defaults

## Documentation
- README for projects
- Inline comments for complex logic
- API documentation for libraries
- Usage examples

## Tools Available
- File operations (read, write, edit)
- Shell commands (exec tool)
- Web search and fetch
- Git operations

## Common Patterns
- Check file existence before reading
- Use path.join() for cross-platform paths
- Wrap risky operations in try-catch
- Log progress for long operations
