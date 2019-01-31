## Stage 0: Prepare Kibana
FROM node:alpine as builder

# 1. Download 6.6.0-snapshot and strip node and node_modules
RUN wget -qO- https://snapshots.elastic.co/downloads/kibana/kibana-oss-6.6.0-SNAPSHOT-linux-x86_64.tar.gz | tar xz

RUN mv kibana-6.6.0-SNAPSHOT-linux-x86_64 kibana
WORKDIR /kibana
RUN mkdir packages
# Keep the required modules built from the monorepo
RUN cp -R node_modules/\@kbn/config-schema/ packages/kbn-config-schema
RUN cp -R node_modules/\@kbn/interpreter/ packages/kbn-interpreter
RUN cp -R node_modules/\@kbn/i18n/ packages/kbn-i18n
# Runnable code is in target therefore src is unrequired
RUN rm -rf packages/kbn-config-schema/src packages/kbn-i18n/src
RUN rm -rf node node_modules

# 2. Add the package.json and yarn.lock files that we've generated.
ADD contrib/package.json package.json
ADD contrib/yarn.lock yarn.lock

# 3. Download and install node_modules.
RUN yarn

# 4. Patch the source code:
 # - remove Optimize mixin and __REPLACE_WITH_PUBLIC_PATH__
ADD build/server/kbn_server.js src/server/kbn_server.js
RUN find optimize dlls -type f -exec sed -i -e 's/__REPLACE_WITH_PUBLIC_PATH__//g' {} \;

 # - patch the Interpreter plugin with ÀLaMode
WORKDIR /
ADD package.json package.json
RUN yarn
RUN yarn alamode kibana/packages/kbn-interpreter/src/common/lib -o kibana/packages/kbn-interpreter/target/common/lib -s
RUN yarn alamode kibana/packages/kbn-interpreter/src/common/interpreter/interpret.js -o kibana/packages/kbn-interpreter/target/common/interpreter -s
RUN yarn alamode kibana/packages/kbn-interpreter/src/server/get_plugin_paths.js -o kibana/packages/kbn-interpreter/target/server -s

# STAGE 2: Setup Proxy
FROM node:alpine
COPY --from=builder kibana kibana

ADD package.json .
ADD yarn.lock .
RUN yarn --production

# Add The Login Screen
ADD static static

ADD build/cli.js build/cli.js
ADD build/proxy-server.js build/proxy-server.js

ENV NODE_ENV production

# Same entrypoint as prev version.
ENTRYPOINT node build/cli -e http://$ELASTIC_SEARCH:9200 -q