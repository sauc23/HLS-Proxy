#! /usr/bin/env node

const argv_vals = require('./lib/process_argv')

const use_tls = (argv_vals["--tls-cert"] && argv_vals["--tls-key"]) || argv_vals["--tls"]

const normalize_host = (host, port) => {
  if (!host) return null

  const parts = host.split(':')

  if (parts.length > 1) {
    host = parts[0]

    const public_port = parseInt( parts[1], 10 )
    if (! isNaN(public_port))
      port = public_port
  }

  return `${host}:${port}`
}

const server = (use_tls)
  ? require('../servers/start_https')({
      port:     argv_vals["--port"],
      tls_cert: argv_vals["--tls-cert"],
      tls_key:  argv_vals["--tls-key"],
      tls_pass: argv_vals["--tls-pass"]
    })
  : require('../servers/start_http')({
      port:     argv_vals["--port"]
    })

const middleware = require('../proxy')({
  is_secure:                            use_tls,
  host:                                 normalize_host(argv_vals["--host"], argv_vals["--port"]),
  copy_req_headers:                     argv_vals["--copy-req-headers"],
  req_headers:                          argv_vals["--req-headers"],
  req_options:                          argv_vals["--req-options"],
  hooks:                                argv_vals["--hooks"],
  cache_segments:                       argv_vals["--prefetch"],
  max_segments:                         argv_vals["--max-segments"],
  cache_timeout:                        argv_vals["--cache-timeout"],
  cache_key:                            argv_vals["--cache-key"],
  cache_storage:                        argv_vals["--cache-storage"],
  cache_storage_fs_dirpath:             argv_vals["--cache-storage-fs-dirpath"],
  debug_level:                          argv_vals["-v"],
  acl_ip:                               argv_vals["--acl-ip"],
  acl_pass:                             argv_vals["--acl-pass"],
  http_proxy:                           argv_vals["--http-proxy"],
  manifest_extension:                   argv_vals["--manifest-extension"],
  segment_extension:                    argv_vals["--segment-extension"]
})

if (middleware.connection)
  server.on('connection', middleware.connection)

if (middleware.request)
  server.on('request', middleware.request)
