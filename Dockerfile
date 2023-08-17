# Dependency images
FROM yti-common-ui:latest as yti-common-ui

# alpine version should match the version in .nvmrc as closely as possible
FROM node:14.18-alpine3.15 as builder

ARG VERSION

# set working directory
WORKDIR /app

# Copy yti-common-ui dependency from image
COPY --from=yti-common-ui /app/dist/yti-common-ui /yti-common-ui/dist/yti-common-ui

# Install and cache app dependencies
COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock
RUN yarn install

# Copy sources
COPY . .

# Create version.txt
RUN echo "$VERSION" > src/version.txt

# Build the dist dir containing the static files
RUN yarn run build

# Stable nginx image
FROM nginx:stable-alpine

# copy artifact build from the 'build environment'
COPY --from=builder /app/dist /usr/share/nginx/html

# copy nginx conf template
COPY nginx.conf /etc/nginx/conf.d/nginx.template

WORKDIR /app

# Copy files from builder to app dir
COPY --from=builder /app/entrypoint.sh .

# Start web server and expose http
EXPOSE 80

ENTRYPOINT ["/app/entrypoint.sh"]
