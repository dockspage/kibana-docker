/*
  Source:
   https://github.com/elastic/kibana/blob/v6.5.2/src/server/kbn_server.js
  Description:
   This is the kbn_server modified to remove the Optimize mixin, that is responsible for starting Webpack. We will serve the optimized bundles ourselves using a Koa proxy server (required to rename __REPLACE_WITH_PUBLIC_PATH__ to '' in optimize bundles).
*/

const { constant, once, compact, flatten } = require('lodash');
const { fromNode } = require('bluebird');
const { isWorker } = require('cluster');
const { fromRoot, pkg } = require('../utils');
const { Config } = require('./config');
const loggingConfiguration = require('./logging/configuration');
const configSetupMixin = require('./config/setup');
const httpMixin = require('./http');
const { loggingMixin } = require('./logging');
const warningsMixin = require('./warnings');
const { usageMixin } = require('./usage');
const { statusMixin } = require('./status');
const pidMixin = require('./pid');
const { configDeprecationWarningsMixin } = require('./config/deprecation_warnings');
const { transformDeprecations } = require('./config/transform_deprecations');
const configCompleteMixin = require('./config/complete');
const Plugins = require('./plugins');
const { indexPatternsMixin } = require('./index_patterns');
const { savedObjectsMixin } = require('./saved_objects');
const { sampleDataMixin } = require('./sample_data');
const { urlShorteningMixin } = require('./url_shortening');
const { serverExtensionsMixin } = require('./server_extensions');
const { uiMixin } = require('../ui');
const { sassMixin } = require('./sass');
const { i18nMixin } = require('./i18n');

const rootDir = fromRoot('.')

               class KbnServer {
  constructor(settings, core) {
    this.name = pkg.name
    this.version = pkg.version
    this.build = pkg.build || false
    this.rootDir = rootDir
    this.settings = settings || {}

    this.core = core

    this.ready = constant(this.mixin(
      Plugins.waitForInitSetupMixin,

      // sets this.config, reads this.settings
      configSetupMixin,

      // sets this.server
      httpMixin,

      // adds methods for extending this.server
      serverExtensionsMixin,
      loggingMixin,
      configDeprecationWarningsMixin,
      warningsMixin,
      usageMixin,
      statusMixin,

      // writes pid file
      pidMixin,

      // find plugins and set this.plugins and this.pluginSpecs
      Plugins.scanMixin,

      // tell the config we are done loading plugins
      configCompleteMixin,

      // setup this.uiExports and this.uiBundles
      uiMixin,
      i18nMixin,
      indexPatternsMixin,

      // setup saved object routes
      savedObjectsMixin,

      // setup routes for installing/uninstalling sample data sets
      sampleDataMixin,

      // setup routes for short urls
      urlShorteningMixin,

      // transpiles SCSS into CSS
      sassMixin,

      // initialize the plugins
      Plugins.initializeMixin,

      // notify any deferred setup logic that plugins have initialized
      Plugins.waitForInitResolveMixin,
    ))

    this.listen = once(this.listen)
  }

  /**
   * Extend the KbnServer outside of the constraints of a plugin. This allows access
   * to APIs that are not exposed (intentionally) to the plugins and should only
   * be used when the code will be kept up to date with Kibana.
   *
   * @param {...function} - functions that should be called to mixin functionality.
   *                         They are called with the arguments (kibana, server, config)
   *                         and can return a promise to delay execution of the next mixin
   * @return {Promise} - promise that is resolved when the final mixin completes.
   */
  async mixin(...fns) {
    for (const fn of compact(flatten(fns))) {
      await fn.call(this, this, this.server, this.config)
    }
  }

  /**
   * Tell the server to listen for incoming requests, or get
   * a promise that will be resolved once the server is listening.
   *
   * @return undefined
   */
  async listen() {
    await this.ready()

    const { server, config } = this

    await server.kibanaMigrator.awaitMigration()

    if (isWorker) {
      // help parent process know when we are ready
      process.send(['WORKER_LISTENING'])
    }

    server.log(['listening', 'info'], `Server running at ${server.info.uri}${
      config.get('server.rewriteBasePath')
        ? config.get('server.basePath')
        : ''
    }`)

    return server
  }

  async close() {
    if (!this.server) {
      return
    }

    await fromNode(cb => this.server.stop(cb))
  }

  async inject(opts) {
    if (!this.server) {
      await this.ready()
    }

    return await this.server.inject(opts)
  }

  applyLoggingConfiguration(settings) {
    const config = new Config(
      this.config.getSchema(),
      transformDeprecations(settings)
    )

    const loggingOptions = loggingConfiguration(config)
    const subset = {
      ops: config.get('ops'),
      logging: config.get('logging'),
    }
    const plain = JSON.stringify(subset, null, 2)
    this.server.log(['info', 'config'], 'New logging configuration:\n' + plain)
    this.server.plugins['even-better'].monitor.reconfigure(loggingOptions)
  }
}

module.exports = KbnServer