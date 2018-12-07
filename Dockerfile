# The new transparent docker file.
FROM node:alpine

# 1. Prepare: download 6.5.2 snapshot and strip node and node_modules, but kibana @kbn modules firts.
RUN wget -qO- https://snapshots.elastic.co/downloads/kibana/kibana-oss-6.5.2-SNAPSHOT-linux-x86_64.tar.gz | tar xz

RUN mv kibana-6.5.2-SNAPSHOT-linux-x86_64 kibana
WORKDIR /kibana
RUN mkdir packages
# Keep the required modules built from from the monorepo
RUN cp -R node_modules/\@kbn/config-schema/ packages/kbn-config-schema
RUN cp -R node_modules/\@kbn/datemath/ packages/kbn-datemath
RUN cp -R node_modules/\@kbn/i18n/ packages/kbn-i18n
# Runnable code is in target therefore src is unrequired
RUN rm -rf packages/kbn-config-schema/src packages/kbn-datemath/src packages/kbn-i18n/src
RUN rm -rf node node_modules

# 2. Patch the source code:
# (1) remove Optimize mixin
ADD build/server/kbn_server.js src/server/kbn_server.js
# (2) remove setup-node-env
ADD build/cli/index.js src/cli/index.js

# 3. Add the package.json and yarn.lock files that we've generated.
ADD contrib/package.json package.json
ADD contrib/yarn.lock yarn.lock

# 4. Download and install node_modules.
RUN yarn

# Same entrypoint as prev version.
ENTRYPOINT node src/cli -e http://$ELASTIC_SEARCH:9200