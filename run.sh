#!/bin/sh

forever stop broker.js
forever start -a -p . -o logs/out.log -e logs/err.log -l logs/forever.log --pidFile forever.pid -w --watchIgnore "logs/*" broker.js