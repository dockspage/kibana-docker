# kibana-docker
The Shell Commands And Node Scripts Used To Create The Artdeco/Kibana Image In A Dockerfile.

## Taken From Source

- [x] To find out the exact required dependencies' versions, the [kibana/v6.5.2/package.json](https://raw.githubusercontent.com/elastic/kibana/v6.5.2/package.json) file is taken from GitHub.
- [x] The `src/server/kbn_server.js` and `src/cli/index.js` are updated to remove Optimize mixing and the `setup-node-env` require.


## `install-deps` Tool

The tool is used to find all missing dependencies by attempting to start the server, and failing, and extracting the missing module name and the file location where the error happened to display in CLI.

![install-deps running](doc/tool.gif)
