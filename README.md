# kibana-docker

The Shell Commands And Node Scripts Used To Create The `artdeco/kibana` Image In A Dockerfile.

- [Clean-up Of Dependnecies](#clean-up-of-dependnecies)
- [Dockerfile](#dockerfile)
- [Development Version & Preparing](#development-version--preparing)
  * [Link Internal Packages](#link-internal-packages)
  * [Built `Interpreter` Package](#built-interpreter-package)
  * [Add Patched `kbn_server`](#add-patched-kbn_server)
  * [Update Vendor's Public Path](#update-vendors-public-path)
  * [Entry point](#entry-point)
- [Taken From Source](#taken-from-source)
- [The `install-deps` Tool](#the-install-deps-tool)
- [Copyright](#copyright)

## Clean-up Of Dependnecies

The problem with the official _Kibana_ image is that it contains all `node_modules`, even the dev dependencies. In addition, the Webpack is so integrated into _Kibana_ that it is required in the production version also, however it does not do anything because the front-end bundles have been pre-compiled. This project removes all unnecessary Babel, React, Webpack & co evil from the distributed image by finding out what dependencies are really needed and thus producing the most minimal built that is not shameful to run in a container.

The image also adds an authorisation level by running an http proxy server to access _Kibana_.

## Dockerfile

We use the *Multi-Stage Build* to create an optimized version of the image.

```docker
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

 # - patch the Interpreter plugin
WORKDIR /
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
```

## Development Version & Preparing

The dev environment for reproduction locally can be set-up by downloading the [snapshot Kibana](https://snapshots.elastic.co/downloads/kibana/kibana-oss-6.6.0-SNAPSHOT-linux-x86_64.tar.gz) and extracting it to the `kibana` directory. This will emulate Docker downloading it for us. Next, there are the following preparation steps.

### Link Internal Packages

There are internal packages that need to be linked. Copy them internal packages in the same way as the `Dockerfile` does, that is create `kibana/packages` and run

```sh
cp -R kibana/node_modules/\@kbn/config-schema kibana/packages/kbn-config-schema
cp -R kibana/node_modules/\@kbn/i18n kibana/packages/kbn-i18n
cp -R kibana/node_modules/\@kbn/interpreter kibana/packages/interpreter
# Add linked the packages from the kibana dir
cd kibana;
yarn add link:packages/kbn-config-schema link:packages/kbn-i18n link:packages/kbn-interpreter/
```

### Built `Interpreter` Package

The `interpreter` package needs to be rebuilt without `babel-runtime` for which we can use ÀLaMode.

```sh
yarn alamode kibana/packages/kbn-interpreter/src/common/lib -o kibana/packages/kbn-interpreter/target/common/lib -s
yarn alamode kibana/packages/kbn-interpreter/src/common/interpreter/interpret.js -o kibana/packages/kbn-interpreter/target/common/interpreter -s
yarn alamode kibana/packages/kbn-interpreter/src/server/get_plugin_paths.js -o kibana/packages/kbn-interpreter/target/server -s
```

Because the plugin's frontend is pre-built separately, it should not affect the workings of _Kibana_. The method to figure out which files need to be built is to try run the `install-deps` and see where it failed.

### Add Patched `kbn_server`

Then, the `kibana/src/server/kbn_server.js` needs to be updated with the patched version that removes the _Optimize_ plugin from `build/server/kbn_server.js`.

### Update Vendor's Public Path

9 vendor files from `kibana/optimize` need `__REPLACE_WITH_PUBLIC_PATH__` replaced to an empty string.

### Entry point

Our `build/cli.js` is a substitute to `kibana/src/cli/index.js` that skips babel setup. It will start the _Kibana_ server and the proxy server and it is the entry point of the application invoked with `yarn start`.

## Taken From Source

- [x] To find out the exact required dependencies' versions, the [kibana/v6.6.0/package.json](https://raw.githubusercontent.com/elastic/kibana/v6.6.0/package.json) file is taken from GitHub and put in the `install_deps` as `kibana.json` for the use by `install-deps.js`.
- [x] The `src/server/kbn_server.js` is updated to remove the Optimize mixin.

## The `install-deps` Tool

The tool is used to find all missing dependencies by attempting to start the server, and failing, and extracting the missing module name and the file location where the error happened to display in CLI.

![install-deps running](doc/tool.gif)

## Copyright

<table>
  <tr>
    <th>
      <a href="https://artd.eco">
        <img src="https://raw.githubusercontent.com/wrote/wrote/master/images/artdeco.png" alt="Art Deco" />
      </a>
    </th>
    <th>
      © <a href="https://artd.eco">Art Deco</a>  
      2019
    </th>
    <th>
      <a href="https://www.technation.sucks" title="Tech Nation Visa">
        <img src="https://raw.githubusercontent.com/artdecoweb/www.technation.sucks/master/anim.gif" alt="Tech Nation Visa" />
      </a>
    </th>
    <th>
      <a href="https://www.technation.sucks">Tech Nation Visa Sucks</a>
    </th>
  </tr>
</table>