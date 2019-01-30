require('alamode')()
const [,,prog] = process.argv
if (!prog)
  throw new Error('No prog specified, pass the path',)
require(`../${prog}`)