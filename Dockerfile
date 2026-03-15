FROM mcr.microsoft.com/playwright:v1.58.2-jammy

WORKDIR /app

# Dependencies
COPY package.json tsconfig.json ./
RUN npm install

# Sources
COPY src ./src
RUN npm run build

# Default variables
ENV START_URL="https://example.org" \
    MAX_PAGES="50" \
    MAX_DEPTH="3" \
    CONCURRENCY="3" \
    SAME_ORIGIN_ONLY="true" \
    CHECK_EXTERNAL_LINKS="false" \
    NAV_TIMEOUT_MS="30000"

CMD ["npm", "start"]