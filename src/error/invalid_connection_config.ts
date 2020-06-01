import { E } from '@mosteast/e';

export class Invalid_connection_config extends E {
  eid = 'invalid_connection_config'
  level = 'internal'

  constructor(config: string | object) {
    super()

    if (typeof config === 'string') {
      this.message = config
    } else {
      this.message = `Invalid connection configurations: ${JSON.stringify(config)}`
      this.data = config
    }
  }
}
