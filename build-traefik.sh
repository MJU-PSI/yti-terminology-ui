#!/bin/bash
#
#
docker build -f Dockerfile.traefik -t yti-terminology-ui . --build-arg NPMRC
