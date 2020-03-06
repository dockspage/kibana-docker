## Development Version & Preparing

The dev environment for reproduction locally can be set-up by downloading the [snapshot Kibana] and extracting it to the `kibana` directory. This will emulate Docker downloading it for us. Next, there are the following preparation steps.

> To get rid of unwanted modules, we will need to remove `node_modules` (rename it to `.node_modules`) and start running the install-deps script to pick up which dependency is missing.

At first, Node process will throw `MODULE_NOT_FOUND` exception failing to start the program altogether, since because require calls won't be able to find the package. But later on, modules will be loaded dynamically as plugins, so we'll listen for console statements that indicate that a module is missing.

### Link Internal Packages

There are internal packages that need to be linked, because they're not publicly published on NPM. Copy them in the same way as the `Dockerfile` does, that is create `kibana/packages` and run

```sh
cp -R kibana/.node_modules/\@kbn/config-schema kibana/packages/kbn-config-schema
cp -R kibana/.node_modules/\@kbn/i18n kibana/packages/kbn-i18n
cp -R kibana/.node_modules/\@kbn/analytics kibana/packages/analytics
cp -R kibana/.node_modules/\@kbn/interpreter kibana/packages/interpreter
# Add linked the packages from the kibana dir
cd kibana;
yarn add link:packages/kbn-config-schema \
         link:packages/kbn-i18n \
         link:packages/analytics
```

`@babel/runtime` dependency is present in kbn-interpreter which needs to be removed from `kibana/packages/kbn-interpreter/package.json`. The `@kbn/i18n` also needs to be added as a link in that package, otherwise it won't.

```sh
cd kibana/packages/kbn-interpreter
yarn add link:../kbn-i18n
```

```sh
cd kibana
yarn add link:packages/kbn-interpreter
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