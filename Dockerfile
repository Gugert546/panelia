# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.server.json ./

# Install all dependencies (including dev for tsc)
RUN npm ci

# Copy server source
COPY server ./server

# Compile TypeScript server
RUN npx tsc --project tsconfig.server.json

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled server from builder
COPY --from=builder /app/dist ./dist

# Ensure server bundle is treated as CommonJS despite root package type=module
RUN mkdir -p dist/server && printf '{"type":"commonjs"}' > dist/server/package.json

# Expose port (Cloud Run uses PORT env var, default 8080)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Set environment
ENV NODE_ENV=production

# Set PORT for Cloud Run (optional, can override)
ENV PORT=8080

# Start server
CMD ["node", "dist/server/index.js"]
