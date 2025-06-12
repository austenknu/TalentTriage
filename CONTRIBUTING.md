# Contributing to TalentTriage

Thank you for your interest in contributing to TalentTriage! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to foster an open and welcoming environment.

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- Redis server
- Supabase account

### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/TalentTriage.git
   cd TalentTriage
   ```
3. Set up the development environment:
   ```bash
   # Make the setup script executable
   chmod +x setup_dev.sh
   
   # Run the setup script
   ./setup_dev.sh
   ```
4. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Backend Development

1. Activate the virtual environment:
   ```bash
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Make your changes to the Python code in the `services/` directory

3. Run tests to ensure your changes don't break existing functionality:
   ```bash
   cd services
   pytest
   ```

4. Start the services for manual testing:
   ```bash
   # Start Redis (if not already running)
   redis-server &
   
   # Start the ingest service
   cd services/ingest_service
   uvicorn main:app --reload --port 8000
   
   # In another terminal, start the worker manager
   cd services
   python worker_manager.py
   ```

### Frontend Development

1. Navigate to the frontend directory:
   ```bash
   cd frontend/nextjs_dashboard
   ```

2. Make your changes to the Next.js code

3. Run tests:
   ```bash
   npm test
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Access the application at [http://localhost:3000](http://localhost:3000)

## Coding Standards

### Backend (Python)

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide
- Use Google-style docstrings
- Include type hints for function parameters and return values
- Write unit tests for new functionality
- Use `loguru` for logging

Example:
```python
from loguru import logger
from typing import List, Dict, Any

def process_data(input_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Process the input data and return results.
    
    Args:
        input_data: A list of dictionaries containing data to process
        
    Returns:
        A dictionary containing the processed results
        
    Raises:
        ValueError: If input_data is empty or invalid
    """
    if not input_data:
        logger.error("Empty input data provided")
        raise ValueError("Input data cannot be empty")
        
    # Process data
    result = {"processed": True, "count": len(input_data)}
    logger.info(f"Processed {len(input_data)} items")
    
    return result
```

### Frontend (TypeScript/React)

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript interfaces for props and state
- Use functional components with hooks
- Use JSDoc comments for components and functions
- Write unit tests for components

Example:
```tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Props for the DataDisplay component
 */
interface DataDisplayProps {
  /** The data to display */
  data: Array<{
    id: string;
    name: string;
    value: number;
  }>;
  /** Optional title for the display */
  title?: string;
}

/**
 * Component for displaying data items with their values
 */
const DataDisplay: React.FC<DataDisplayProps> = ({ data, title }) => {
  const [total, setTotal] = useState<number>(0);
  
  useEffect(() => {
    // Calculate total when data changes
    const sum = data.reduce((acc, item) => acc + item.value, 0);
    setTotal(sum);
  }, [data]);
  
  return (
    <Box sx={{ padding: 2 }}>
      {title && <Typography variant="h6">{title}</Typography>}
      <Typography variant="body1">Total: {total}</Typography>
      {data.map((item) => (
        <Box key={item.id} sx={{ marginY: 1 }}>
          <Typography>{item.name}: {item.value}</Typography>
        </Box>
      ))}
    </Box>
  );
};

export default DataDisplay;
```

## Commit Guidelines

- Use clear and descriptive commit messages
- Follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation changes
  - `style:` for code style changes (formatting, etc.)
  - `refactor:` for code refactoring
  - `test:` for adding or modifying tests
  - `chore:` for maintenance tasks

Examples:
```
feat: add candidate filtering by skills
fix: correct score calculation for experience
docs: update API documentation
refactor: improve error handling in parse worker
```

## Pull Request Process

1. Update the README.md or documentation with details of changes if appropriate
2. Run all tests to ensure they pass
3. Update the version numbers in any example files and the README.md to the new version
4. Submit a pull request to the `main` branch
5. The pull request will be reviewed by maintainers

## Testing Guidelines

### Backend Testing

- Use `pytest` for unit and integration tests
- Aim for at least 80% test coverage
- Mock external dependencies (Supabase, Redis, etc.)
- Test both success and failure cases

### Frontend Testing

- Use Jest and React Testing Library for component tests
- Test component rendering and interactions
- Mock API calls and external dependencies
- Test both success and error states

## Documentation

- Update documentation when adding or modifying features
- Document API endpoints, request/response formats
- Include JSDoc comments for functions and components
- Keep the README.md up to date

## Logging Standards

- Use appropriate log levels:
  - `debug`: Detailed information for debugging
  - `info`: General information about application progress
  - `warning`: Potential issues that don't affect functionality
  - `error`: Errors that affect functionality but don't crash the application
  - `critical`: Critical errors that may crash the application

- Include context in log messages:
  - File or module name
  - Function or method name
  - Relevant IDs (job_id, upload_id, etc.)

Example:
```python
logger.info(f"parse_worker: Started processing upload_id={upload_id}")
logger.error(f"embedding_worker: Failed to generate embedding for candidate_id={candidate_id}", exc_info=True)
```

## Release Process

1. Update the version number in relevant files
2. Update the CHANGELOG.md with details of changes
3. Create a new release on GitHub with release notes
4. Tag the release with the version number

## Questions?

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact the maintainers directly
- Join our community chat (if available)

Thank you for contributing to TalentTriage!
