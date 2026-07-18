```markdown
# journeyman Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `journeyman` TypeScript codebase. It covers file organization, code style, commit conventions, and testing patterns, providing practical examples and commands to streamline your workflow. The repository does not use a specific framework, focusing on idiomatic TypeScript and clear, maintainable code.

## Coding Conventions

### File Naming
- Use **kebab-case** for all filenames.
  - Example:  
    ```
    user-service.ts
    data-processor.test.ts
    ```

### Import Style
- Mixed import styles are used, including both default and named imports.
  - Example:
    ```typescript
    import { fetchData } from './api-utils';
    import config from './config';
    ```

### Export Style
- Prefer **named exports** for all modules.
  - Example:
    ```typescript
    // Good
    export function parseInput(input: string): ParsedInput { ... }
    export const DEFAULT_TIMEOUT = 5000;

    // Avoid default exports
    // export default function() { ... }
    ```

### Commit Patterns
- Use **Conventional Commits** with the `fix` prefix for bug fixes.
  - Example:
    ```
    fix: handle null values in user profile parser
    ```

## Workflows

### Bug Fix Workflow
**Trigger:** When you need to fix a bug in the codebase  
**Command:** `/fix-bug`

1. Identify the bug and create a new branch (e.g., `fix/user-profile-null`)
2. Make code changes following the coding conventions above
3. Write or update tests in a corresponding `*.test.ts` file
4. Commit changes using the `fix:` prefix and a concise description
   - Example: `fix: correct date parsing in event scheduler`
5. Push your branch and open a pull request for review

## Testing Patterns

- Test files use the pattern `*.test.*` (e.g., `user-service.test.ts`)
- The testing framework is not explicitly specified; follow standard TypeScript testing practices.
- Place tests alongside the modules they cover or in a dedicated `tests` directory.
- Example test file:
  ```typescript
  // user-service.test.ts
  import { getUserById } from './user-service';

  describe('getUserById', () => {
    it('returns user data for a valid ID', () => {
      const user = getUserById('123');
      expect(user).toBeDefined();
    });
  });
  ```

## Commands
| Command      | Purpose                                  |
|--------------|------------------------------------------|
| /fix-bug     | Start the bug fix workflow               |
```
