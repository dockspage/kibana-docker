FROM node:alpine

RUN wget -qO- https://snapshots.elastic.co/downloads/kibana/kibana-oss-6.5.2-SNAPSHOT-linux-x86_64.tar.gz | tar xz -C kibana

WORKDIR /kibana
RUN mkdir packages
RUN cp -R node_modules/\@kbn/config-schema/ packages/kbn-config-schema
RUN cp -R node_modules/\@kbn/datemath/ packages/kbn-datemath
RUN cp -R node_modules/\@kbn/i18n/ packages/kbn-i18n
RUN rm -rf packages/kbn-config-schema/src packages/kbn-datemath/src packages/i18n/src
RUN rm -rf node node_modules