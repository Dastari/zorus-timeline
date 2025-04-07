# Dockerfile

# Use a specific Node.js version, Alpine for smaller image size
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Copy the standalone server output
COPY dist/standalone ./

# Copy the static assets to the location expected by the standalone server
# The server looks for static files within its own .next directory
COPY dist/static ./dist/standalone/.next/static

# Copy the public folder if it exists and contains necessary assets
# Note: Standalone output *might* already copy needed public files,
# but explicitly copying ensures they are present. Adjust if needed.
COPY public ./dist/standalone/public

# Set the NODE_ENV to production
# Required for Next.js standalone mode to run correctly
ENV NODE_ENV=production
# Set the port Next.js should listen on
ENV PORT=3000

# Expose the port the app runs on
EXPOSE 3000

# Best practice: Run as non-root user
USER node

# Command to run the standalone server
# This assumes server.js is the entry point in the standalone output
CMD ["node", "server.js"]
