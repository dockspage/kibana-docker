/**
 * Runs proxy server and CLI from kibana/src/cli/cli.
 */
const proxyServer = require('./proxy-server');

const PROD = process.env.NODE_ENV == 'production'

;(async () => {
  const url = await proxyServer(PROD)
  console.log(
    'Proxy started on %s%s', url,
    PROD ? ' in production mode' : ''
  )
  require('../kibana/src/cli/cli')
})()