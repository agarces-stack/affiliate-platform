FROM node:22-alpine

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Don't copy .env (should be mounted or env vars)
RUN rm -f config/.env

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
