#!/bin/sh
#
# Note runlevel 2345, 86 is the Start order and 85 is the Stop order
#
# chkconfig: 2345 86 85
# description: phpsock library server daemon

export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules

case "$1" in
  start)
  cd $(dirname `readlink -f $0 || realpath $0`)
  cd ..
  mkdir -p /var/log/phpsock-broker
  forever stop broker.js > /dev/null 2>&1
  forever start -a -p . --killSignal=SIGABRT --minUptime 1000 --spinSleepTime 100 -e /var/log/phpsock-broker/error.log -l /var/log/phpsock-broker/forever.log --pidFile ./forever.pid broker.js
  ;;
stop)
  cd $(dirname `readlink -f $0 || realpath $0`)
  cd ..
  exec forever stop broker.js
  ;;
restart)
  cd $(dirname `readlink -f $0 || realpath $0`)
  cd ..
  exec forever restart broker.js
  ;;
status)
  cd $(dirname `readlink -f $0 || realpath $0`)
  forever list | grep broker.js
  ;;  
log)
  cd $(dirname `readlink -f $0 || realpath $0`)
  exec ./log.sh
  ;;  
*)
  echo "Usage: /etc/init.d/phpsock-broker {start|stop|restart|status|log}"
  exit 1
  ;;
esac

exit 0

