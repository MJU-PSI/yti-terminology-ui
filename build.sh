#!/bin/bash
#
#
mkdir -p tmp
cp -r ../yti-common-ui/dist/* tmp
docker build -f Dockerfile -t yti-terminology-ui .
