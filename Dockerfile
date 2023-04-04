# alpine version should match the version in .nvmrc as closely as possible
FROM node:14.18-alpine3.15 as builder

ARG VERSION

# set working directory
WORKDIR /app

# install and cache app dependencies
COPY tmp/yti-common-ui /yti-common-ui/dist/yti-common-ui
COPY package.json /app/package.json
RUN yarn install

# Fetch dependencies
COPY . .

# Create version.txt
RUN echo "$VERSION" > src/version.txt

# Build the dist dir containing the static files
RUN yarn run build

# Stable nginx image
FROM nginx:stable-alpine

# copy artifact build from the 'build environment'
COPY --from=builder /app/dist /usr/share/nginx/html

WORKDIR /app

# Copy node_modules from builder to app dir
COPY --from=builder /app/entrypoint.sh .

# Start web server and expose http
EXPOSE 80

ENTRYPOINT ["/app/entrypoint.sh"]
