FROM denoland/deno:2.2.3

EXPOSE 3000

# Create working directory
WORKDIR /app

# Copy source
COPY . .

# Compile the main app
RUN deno cache main.ts

# Run the app
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]
