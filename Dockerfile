FROM node:20.11-slim

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci

# Bundle app source
COPY . .

EXPOSE 3000
ENTRYPOINT [ "npm", "run", "serve:prod" ]