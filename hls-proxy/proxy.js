const request  = require('@warren-bank/node-request').request
const acl_pass = require('./acl_pass')
const cookies  = require('./cookies')
const parser   = require('./manifest_parser')
const timers   = require('./timers')
const utils    = require('./utils')

const get_middleware = function(params) {
  const {cache_segments} = params
  let   {acl_ip}         = params

  const segment_cache = require('./segment_cache')(params)
  const {get_segment, add_listener} = segment_cache

  const is_acl_pass_allowed = acl_pass.is_allowed.bind(null, params)
  const debug               = utils.debug.bind(null, params)
  const parse_req_url       = utils.parse_req_url.bind(null, params)
  const get_request_options = utils.get_request_options.bind(null, params)
  const modify_m3u8_content = parser.modify_m3u8_content.bind(null, params, segment_cache)

  const middleware = {}

  // Access Control
  if (acl_ip && Array.isArray(acl_ip) && acl_ip.length) {
    middleware.connection = (socket) => {
      if (socket && socket.remoteAddress) {
        const remote_ip = socket.remoteAddress.toLowerCase().replace(/^::?ffff:/, '')

        if (acl_ip.indexOf(remote_ip) === -1) {
          socket.destroy()
          debug(2, socket.remoteFamily, 'connection blocked by ACL IP whitelist:', remote_ip)
        }
      }
    }
  }

  // Create an HTTP tunneling proxy
  middleware.request = async (req, res) => {
    if (!is_acl_pass_allowed(req)) {
      res.writeHead(401)
      res.end()
      debug(2, 'request blocked by ACL password whitelist:', req.url)
      return
    }

    debug(3, 'proxying (raw):', req.url)

    utils.add_CORS_headers(res)

    const {redirected_base_url, url_type, url, referer_url} = parse_req_url(req)

    if (!url) {
      res.writeHead(400)
      res.end()
      return
    }

    const qs_password = acl_pass.get_encoded_qs_password(req)
    const is_m3u8     = (url_type === 'm3u8')

    const send_cache_segment = function(segment, type) {
      if (!type)
        type = utils.get_content_type(url_type)

      res.writeHead(200, {"content-type": type, "content-length": segment.length})
      res.end(segment)
    }

    if (cache_segments && !is_m3u8) {
      let {segment, type} = await get_segment(url, url_type)  // possible datatypes of segment value: Buffer (cached segment data), false (prefetch is pending: add callback), null (no prefetch is pending)

      if (segment && segment.length) {                        // Buffer (cached segment data)
        send_cache_segment(segment, type)
        return
      }
      else if (segment === false) {                           // false (prefetch is pending: add callback)
        add_listener(url, url_type, send_cache_segment)
        return
      }
    }

    const options = get_request_options(url, is_m3u8, referer_url, req.headers)
    debug(1, 'proxying:', url)
    debug(3, 'm3u8:', (is_m3u8 ? 'true' : 'false'))

    request(options, '', {binary: !is_m3u8, stream: !is_m3u8, cookieJar: cookies.getCookieJar()})
    .then(({redirects, response}) => {
      debug(2, 'proxied response:', {status_code: response.statusCode, headers: response.headers, redirects})

      if (!is_m3u8) {
        if (response.headers) {
          const headers = {}
          for (let header of ['content-type', 'content-length']) {
            if (response.headers[header])
              headers[header] = response.headers[header]
          }
          res.writeHead(200, headers)
        }
        else {
          res.writeHead(200)
        }
        response.pipe(res)
      }
      else {
        const m3u8_url = (redirects && Array.isArray(redirects) && redirects.length)
          ? redirects[(redirects.length - 1)]
          : url

        res.writeHead(200, { "content-type": "application/x-mpegURL" })
        res.end( modify_m3u8_content(response.toString().trim(), m3u8_url, referer_url, req.headers, redirected_base_url, qs_password) )
      }
    })
    .catch((e) => {
      debug(0, 'ERROR:', e.message)
      res.writeHead(500)
      res.end()
    })
  }

  timers.initialize_timers(params)

  return middleware
}

module.exports = get_middleware
