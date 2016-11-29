#!/bin/sh
export PHPSOCK_LOGS=/var/log/phpsock-broker

tail -500f $PHPSOCK_LOGS/forever.log | bunyan