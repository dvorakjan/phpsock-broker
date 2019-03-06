# PHPsock-broker

Server daemon part of PHPsock library which mediates WebSocket communication between JS clients and PHP server.

## Other parts of library

- [PHPsock-broker](https://github.com/dvorakjan/phpsock-broker) Node.js broker daemon
- [PHPsock-client](https://github.com/dvorakjan/phpsock-client) JavaScript client library
- [PHPsock-connector](https://github.com/dvorakjan/phpsock-connector) PHP connector

## TODO

- [ ] 🔐 SECURITY: separate clients by domain and somehow block cross-domain calls (instead of current `domain#...` prefixes)
- [ ] 💅 REFACTORING: work with `clientsByAlias` in some more simple and functional way
