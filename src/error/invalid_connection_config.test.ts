import { Invalid_connection_config } from './invalid_connection_config'

it('invalid_connection_config', async () => {
  expect(() => {throw new Invalid_connection_config('a')}).toThrow('a')
  const config = { a: 1, b: 2 }
  let e = new Invalid_connection_config(config)
  expect(() => {throw e}).toThrow(/Invalid connection configurations:/)
  expect(e.data).toEqual(config)
})
