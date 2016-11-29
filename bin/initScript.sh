#!/bin/sh
#
# Note runlevel 2345, 86 is the Start order and 85 is the Stop order
#
# chkconfig: 2345 86 85
# description: phpsock library server daemon

export PHPSOCK_HOME=/home/phpsock
export PHPSOCK_LOGS=/var/log/phpsock-broker
export PHPSOCK_USER=nginx
export PHPSOCK_GROUP=nginx

export PATH=$PATH:/usr/local/bin
export NODE_PATH=$NODE_PATH:/usr/local/lib/node_modules

case "$1" in
  start)
  cd $PHPSOCK_HOME
  sudo HOME=$PHPSOCK_HOME -u $PHPSOCK_USER -g $PHPSOCK_GROUP forever stop broker.js > /dev/null 2>&1
  sudo HOME=$PHPSOCK_HOME -u $PHPSOCK_USER -g $PHPSOCK_GROUP forever start -a -p . --killSignal=SIGABRT --minUptime 1000 --spinSleepTime 100 -e $PHPSOCK_LOGS/error.log -l $PHPSOCK_LOGS/forever.log --pidFile ./forever.pid broker.js
  ;;
stop)
  cd $PHPSOCK_HOME
  sudo HOME=$PHPSOCK_HOME -u $PHPSOCK_USER -g $PHPSOCK_GROUP forever stop broker.js
  ;;
restart)
  cd $PHPSOCK_HOME
  sudo HOME=$PHPSOCK_HOME -u $PHPSOCK_USER -g $PHPSOCK_GROUP forever restart broker.js
  ;;
status)
  cd $PHPSOCK_HOME
  sudo HOME=$PHPSOCK_HOME -u $PHPSOCK_USER -g $PHPSOCK_GROUP forever list | grep broker.js
  ;;  
log)
  cd $PHPSOCK_HOME
  sudo HOME=$PHPSOCK_HOME -u $PHPSOCK_USER -g $PHPSOCK_GROUP ./bin/log.sh
  ;;  
*)
  echo "Usage: /etc/init.d/phpsock-broker {start|stop|restart|status|log}"
  exit 1
  ;;
esac

exit 0

