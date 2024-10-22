# Use Node.js 20 as the base image
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml (if it exists)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    else echo "Warning: pnpm-lock.yaml not found. Running pnpm install." && pnpm install; \
    fi

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN pnpm build

# Start a new stage for a smaller production image
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml (if it exists)
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN npm install -g pnpm && \
    if [ -f pnpm-lock.yaml ]; then pnpm install --prod --frozen-lockfile; \
    else echo "Warning: pnpm-lock.yaml not found. Running pnpm install --prod." && pnpm install --prod; \
    fi

# Copy built assets from the base stage
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.mjs ./next.config.mjs

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]