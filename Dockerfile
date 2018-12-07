FROM node:alpine

# 1. Prepare: download 6.5.2 snapshot and strip node and node_modules,
# but keep some kibana's monorepo @kbn modules first.
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

# 2. Add the package.json and yarn.lock files that we've generated.
ADD contrib/package.json package.json
ADD contrib/yarn.lock yarn.lock

# 3. Download and install node_modules.
RUN yarn

WORKDIR /

ADD package.json .
ADD yarn.lock .
RUN yarn

# 3.0 Add The Login Screen
ADD static static

# 4. Patch The Source Code: remove Optimize mixin and __REPLACE_WITH_PUBLIC_PATH__
ADD build/server/kbn_server.js kibana/src/server/kbn_server.js
RUN find kibana/optimize -type f -exec sed -i -e 's/__REPLACE_WITH_PUBLIC_PATH__//g' {} \;

ADD build build/cli.js
ADD build proxy-server/cli.js

ENV NODE_ENV production

# Same entrypoint as prev version.
ENTRYPOINT node build/cli -e http://$ELASTIC_SEARCH:9200