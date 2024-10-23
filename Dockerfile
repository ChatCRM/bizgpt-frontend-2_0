# Use Node.js 20 as the base image
FROM node:20-alpine AS base

# ARG OPENAI_API_KEY
# ENV OPENAI_API_KEY=$OPENAI_API_KEY

# ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
# ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY

# ARG NEXT_PUBLIC_SUPABASE_BUCKET_NAME
# ENV NEXT_PUBLIC_SUPABASE_BUCKET_NAME=$NEXT_PUBLIC_SUPABASE_BUCKET_NAME

# ARG NEXT_PUBLIC_SUPABASE_SCHEMA
# ENV NEXT_PUBLIC_SUPABASE_SCHEMA=$NEXT_PUBLIC_SUPABASE_SCHEMA

# ARG NEXT_PUBLIC_SUPABASE_URL
# ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL

# ARG NEXT_SUPABASE_SERVICE_ROLE_KEY
# ENV NEXT_SUPABASE_SERVICE_ROLE_KEY=$NEXT_SUPABASE_SERVICE_ROLE_KEY

# ARG OPENAI_ASSISTANT_ID
# ENV OPENAI_ASSISTANT_ID=$OPENAI_ASSISTANT_ID

# ARG NEXT_PUBLIC_BIZGPT_FRONTEND_LANGUAGE
# ENV NEXT_PUBLIC_BIZGPT_FRONTEND_LANGUAGE=$NEXT_PUBLIC_BIZGPT_FRONTEND_LANGUAGE

# ARG NEXT_PUBLIC_CLIENT_BRANDING_NAME
# ENV NEXT_PUBLIC_CLIENT_BRANDING_NAME=$NEXT_PUBLIC_CLIENT_BRANDING_NAME

# ARG NEXT_PUBLIC_EMPTY_TEXT_BODY
# ENV NEXT_PUBLIC_EMPTY_TEXT_BODY=$NEXT_PUBLIC_EMPTY_TEXT_BODY

# ARG NEXT_PUBLIC_EMPTY_TEXT_HEADER
# ENV NEXT_PUBLIC_EMPTY_TEXT_HEADER=$NEXT_PUBLIC_EMPTY_TEXT_HEADER

# ARG NEXT_PUBLIC_FOOTER_CLIENT_TEXT
# ENV NEXT_PUBLIC_FOOTER_CLIENT_TEXT=$NEXT_PUBLIC_FOOTER_CLIENT_TEXT

# ARG NEXT_PUBLIC_OUTLINE_ADDRESS
# ENV NEXT_PUBLIC_OUTLINE_ADDRESS=$NEXT_PUBLIC_OUTLINE_ADDRESS

# ARG NEXT_PUBLIC_TEXT_DIRECTION
# ENV NEXT_PUBLIC_TEXT_DIRECTION=$NEXT_PUBLIC_TEXT_DIRECTION

# ARG NEXT_PUBLIC_USE_EXAMPLE_MESSAGES
# ENV NEXT_PUBLIC_USE_EXAMPLE_MESSAGES=$NEXT_PUBLIC_USE_EXAMPLE_MESSAGES

# ARG NEXT_PUBLIC_USE_FOOTER_CLIENT_TEXT
# ENV NEXT_PUBLIC_USE_FOOTER_CLIENT_TEXT=$NEXT_PUBLIC_USE_FOOTER_CLIENT_TEXT

# ARG SITE_URL
# ENV SITE_URL=$SITE_URL

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
COPY .env .env
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
COPY --from=base /app ./
# COPY --from=base /app/public ./public
# COPY --from=base /app/next.config.js ./next.config.js
# COPY --from=base /app/components ./components
# COPY --from=base /app/context ./context
# COPY --from=base /app/lib ./lib
# COPY --from=base /app/translation ./translation
# COPY --from=base /app/utils ./utils
# COPY --from=base /app/middleware.ts ./middleware.ts
# COPY --from=base /app/auth.ts ./auth.ts
# COPY --from=base /app/components.json ./components.json

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]