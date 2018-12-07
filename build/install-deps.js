let spawn = require('spawncommand'); const { fork } = spawn; if (spawn && spawn.__esModule) spawn = spawn.default;
const { relative } = require('path');
const { dependencies, devDependencies } = require('./kibana.json');

const DD = { ...dependencies, ...devDependencies }

const getFile = (err) => {
  const [,file] = new RegExp(`(${process.cwd()}.+)\\)$`, 'm').exec(err) || []
  if (!file) throw new Error('Cannot find the module where imported.')
  const [path, line, col] = file.split(':')

  const p = relative('', path)
  return `${p}:${line}:${col}`
}
async function run() {
  const f = fork('src/cli', [], {
    stdio: 'pipe',
    cwd: 'kibana',
  })
  const P = new Promise((re) => {
    f.stdout.on('data', d => {
      if (/log/.test(d)) {
        re({ stdout: '' })
        console.log('Server started.')
        f.kill()
      }
    })
  })
  const res = await Promise.race([
    f.promise,
    P,
  ])
  let [,r] = /Cannot find module '(.+?)'/.exec(res.stderr) || []
  const file = getFile(res.stderr)
  if (r) {
    const rr = r.split('/', 1)
    if (!r.startsWith('@')) r = rr
    console.log(
      'MISSING %s%s in %s', r, r != rr ? ` (import ${rr})` : '',
      file,
    )
    const version = DD[r]
    if (!version) throw new Error('Unknown version')
    const exact = `${r}@${version}`
    console.log(' yarn add -E %s', exact)
    const p = spawn('yarn', ['add', '-E', exact], { cwd: 'kibana' })
    const rres = await p.promise
    if (rres.code != 0) throw new Error(rres.stderr)
    await run()
  }
}

(async () => {
  try {
    await run()
  } catch ({ stack }) {
    console.log(stack)
  }
})()