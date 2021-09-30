#!/usr/bin/env sh

VERSION=$(cat version)

docker build -t eu.gcr.io/e8-gke/botfront:$VERSION .
