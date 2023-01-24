#!/bin/bash
#
#
docker build -f Dockerfile.local -t yti-terminology-ui . --build-arg NPMRC
