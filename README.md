# Web-Auditor (with Playwright)

## TL;DR

```shell
npm install
npm run build
npm start
```

## Build & run

```shell
docker build -t elasticms/web-auditor .

docker run --rm \
  -e START_URL="https://ton-site.be" \
  -e MAX_PAGES="80" \
  -e MAX_DEPTH="4" \
  -e CONCURRENCY="2" \
  -e CHECK_EXTERNAL_LINKS="false" \
  elasticms/web-auditor
```

## Code Formatting and Linting

This project uses **Prettier** for automatic code formatting and **ESLint** for static code analysis.  
Together, they ensure a consistent code style and help detect potential issues early during development.

- **Prettier** → handles formatting (indentation, quotes, line length, etc.)
- **ESLint** → enforces coding best practices and detects problematic patterns

Both tools are configured to work together without conflicts.

### Format the Entire Project

To format all files:

```bash
npm run format
```

### Check Formatting

To verify that files follow the formatting rules (useful in CI pipelines):

```bash
npm run format:check
```

If formatting issues are found, run npm run format to automatically fix them.

### Run the Linter

To analyze the project:

```bash
npm run lint
```

### Automatically Fix Issues

Some issues can be fixed automatically:

```bash
npm run lint:fix
```
