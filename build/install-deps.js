let spawn = require('spawncommand'); const { fork } = spawn; if (spawn && spawn.__esModule) spawn = spawn.default;
const { dependencies, devDependencies } = require('./kibana.json');

const DD = { ...dependencies, ...devDependencies }

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
  const [,r] = /Cannot find module '(.+?)'/.exec(res.stderr) || []
  if (r) {
    console.log('MISSING %s', r)
    const version = DD[r]
    if (!version) throw new Error('Unknown version')
    const exact = `${r}@${version}`
    // const a = await confirm(`Install ${exact}?`)
    // if (!a) return
    console.log(' yarn add -E %s', exact)
    const p = spawn('yarn', ['add', '-E', exact])
    const rres = await p.promise
    if (rres.code != 0) throw new Error(rres.stderr)
    // await confirm(`${r} installed. Continue?`)
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