import { Lack_argument } from './lack_argument'

it('array args', async () => {
	const keys = [ 'a', 'b' ]
	const e = new Lack_argument(keys)
	expect(e.data.required_keys).toHaveLength(2)
})

it('array of array args', async () => {
	const keys = [ 'a', 'b', [ 'c', 'd' ], [ 'e', 'f' ] ]
	const e = new Lack_argument(keys, 'a')
	expect(e.data.required_keys).toHaveLength(2)
	expect(e.data.required_set).toHaveLength(2)
})