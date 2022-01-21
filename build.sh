#!/usr/bin/env sh

VERSION=$(cat version)

docker build -t ghcr.io/epoch8/botfront/botfront:$VERSION .
