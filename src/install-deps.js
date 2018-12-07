import spawn, { fork } from 'spawncommand'
import { relative } from 'path'
import { dependencies, devDependencies } from './kibana.json'
import { c } from 'erte'

const DD = { ...dependencies, ...devDependencies }

const getFile = (err) => {
  const [,file] = new RegExp(`(${process.cwd()}.+)\\)$`, 'm').exec(err) || []
  if (!file) return null
  const [path, line, col] = file.split(':')

  const p = relative('', path)
  return `${p}:${line}:${col}`
}
async function run() {
  const f = fork('src/cli', [], {
    stdio: 'pipe',
    execArgv: [], // eternal debug
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
  if (!r) {
    console.log('Error didn\'t happen (server started?)')
    return
  }
  let file = getFile(res.stderr)
  if (!file) try {
    const { error: { stack } } = JSON.parse(res.stdout)
    file = getFile(stack)
    debugger
  } catch (err) {
    throw new Error('Could not find the file.')
  }
  const rr = r.split('/', 1)
  const isScoped = r.startsWith('@')
  if (!isScoped) r = rr
  console.log(
    'MISSING %s%s in %s', r, !isScoped && (r != rr) ? ` (import ${rr})` : '',
    c(file, 'grey'),
  )
  const version = DD[r]
  if (!version) throw new Error('Unknown version')
  const exact = `${r}@${version}`
  console.log(' yarn add -E %s', c(exact, 'green'))
  const p = spawn('yarn', ['add', '-E', exact], { cwd: 'kibana' })
  const rres = await p.promise
  if (rres.code != 0) throw new Error(rres.stderr)
  await run()
}

(async () => {
  try {
    await run()
  } catch ({ stack }) {
    console.log(stack)
  }
})()