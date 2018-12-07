// This is just the script to run kibana node build/cli
// can't just with alamode because of args parsing
import proxyServer from './proxy-server'

const PROD = process.env.NODE_ENV == 'production'

;(async () => {
  const url = await proxyServer(PROD)
  console.log(
    'Proxy started on %s%s', url,
    PROD ? ' in production mode' : ''
  )
  require('../kibana/src/cli/cli')
})()