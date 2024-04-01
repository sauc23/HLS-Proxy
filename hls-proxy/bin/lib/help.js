const help = `
hlsd <options>

options:
========
--help
--version
--tls
--host <host>
--port <number>
--copy-req-headers
--req-headers <filepath>
--origin <header>
--referer <header>
--useragent <header>
--header <name=value>
--req-options <filepath>
--req-insecure
--req-secure-honor-server-cipher-order
--req-secure-ciphers <string>
--req-secure-protocol <string>
--req-secure-curve <string>
--hooks <filepath>
--prefetch
--max-segments <number>
--cache-timeout <number>
--cache-key <number>
--cache-storage <adapter>
--cache-storage-fs-dirpath <dirpath>
-v <number>
--acl-ip <ip_address_list>
--acl-pass <password_list>
--http-proxy <http[s]://[user:pass@]hostname:port>
--tls-cert <filepath>
--tls-key <filepath>
--tls-pass <filepath>
--manifest-extension <ext>
--segment-extension <ext>
`

module.exports = help
