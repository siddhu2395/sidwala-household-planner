# Stage 1: Build the React client
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:20-alpine AS production

# Security: Run as non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app
COPY server/package.json server/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY server/ ./
COPY --from=client-build /app/client/dist ./public

# Security: Set ownership and switch to non-root user
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["node", "index.js"]
