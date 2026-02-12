# Task Routing Context

## Task Classification Guidelines

### Quick Operations (cheap tier - GPT-4o)
- File listing and reading
- Simple data extraction
- Basic summarization
- Fact lookup

### Standard Operations (mid tier - Sonnet)
- General conversation
- Writing and editing
- Code implementation
- Tool orchestration

### Complex Operations (high tier - Opus)
- Architecture design
- Strategic planning
- Complex debugging
- Multi-step reasoning

## Model Selection Hints

When you need to classify your own task:
- **file_ops**: Reading, writing, or manipulating files
- **extract**: Parsing or pulling specific data
- **summarize**: Creating summaries or overviews
- **code**: Programming, debugging, implementation
- **strategy**: Planning, analysis, decision-making
- **write**: General communication (default)

## Escalation Signals

Escalate to higher tier when:
- Validation failures occur
- Repeated tool errors (2+)
- Explicit uncertainty ("I'm not sure how to...")
- Task proves more complex than initially assessed

## Token Efficiency

- Be concise by default
- Expand only when explicitly requested
- Prefer structured data (JSON/YAML) over prose
- Avoid redundant confirmations
