let idioCore = require('@idio/core'); if (idioCore && idioCore.__esModule) idioCore = idioCore.default;
let proxy = require('koa-better-http-proxy'); if (proxy && proxy.__esModule) proxy = proxy.default;
let compose = require('koa-compose'); if (compose && compose.__esModule) compose = compose.default;

/**
 * Starts the proxy server that servers /static and /kibana/optimize dirs.
 */
               async function startProxy(prod) {
  const maxage = prod ? 1000 * 60 * 60 * 24 : null
  const port = process.env.PORT || 5000
  const { router, app, url,
    middleware: { bodyparser } } = await idioCore({
    // logger: { use: PROD },
    session: {
      use: true,
      keys: [process.env.SESSION_KEY || 'local-key'],
    },
    static: [{ use: true, root: ['static', 'kibana/optimize'],
      maxage,
    }, { use: true, root: 'kibana/dlls', mount: '/dlls',
      maxage,
    }],
    bodyparser: {},
  }, { port })
  router.post('/auth', bodyparser, Login)
  app.use(router.routes())

  const p = proxy('http://localhost:5601')
  app.use(prod ? compose([ checkSession, p]) : p)
  return url
}

async function checkSession(ctx, next) {
  if (!ctx.session.user) {
    ctx.redirect('/auth.htm')
  } else await next()
}

// can't use next otherwise will hit proxy but what if next was needed for prev middleware
const Login = async (ctx) => {
  if (!process.env.PASSWORD) {
    ctx.status = 500
    ctx.body = 'The PASSWORD environment variable not set on the container.'
    return
  }
  if (ctx.request.body.password != process.env.PASSWORD) {
    ctx.status = 500
    ctx.body = 'Wrong password'
    return
  }
  ctx.session.user = ctx.request.body.login
  ctx.redirect('/')
}

module.exports = startProxy