## Taken From Source

- [x] To find out the exact required dependencies' versions, the [kibana/v7.6.1/package.json](https://raw.githubusercontent.com/elastic/kibana/v7.6.1/package.json) file is taken from _GitHub_ and put in the `install_deps` as `kibana.json` for the use by `install-deps.js`.
- [x] The `src/server/kbn_server.js` is updated to remove the Optimize mixin.

%~%

<!--
## `verify-versions`

This tool will fetch the `package.json` from GitHub, and compare the versions in the Kibana's `package.json` against the online values. The verification step can be required to make sure that there are no rogue dependencies in this image. -->
