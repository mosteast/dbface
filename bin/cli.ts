#!/usr/bin/env ts-node

import * as yargs from 'yargs';
import { Argv } from 'yargs';

yargs
  .command({
    command: '$0',
    describe: 'CLI for dbface - use `xxx --help` to see sub-command help info',
    builder,
    handler() {},
  }).argv;

function builder(argv: Argv): Argv {
  return argv
    .options({
      config_paths: {
        alias: 'c',
        type: 'array',
        demandOption: false,
      },
    })
    .command({
      command: 'migration',
      aliases: [ 'm' ],
      describe: 'Database migration commands',
      builder(argv) {
        return argv
          // .command({
          //   command: 'go <step>',
          //   aliases: [ 'g' ],
          //   describe: 'How many migration files to run, `go 1`: migrate 1 file forward, `go -2` migrate 2 files backward',
          //   builder<I_migration_go>(argv: any) {
          //     return argv
          //       .options({
          //         step: {
          //           type: 'number',
          //           desc: 'How many steps to forward, default is 0: unlimited to latest migration',
          //           default: 0,
          //         },
          //       });
          //   },
          //   handler: run,
          // })
          .command({
            command: 'forward',
            aliases: [ 'f' ],
            describe: 'Migrate forward, some call it "migrate run|up"',
            builder(argv) {
              return argv
                .options({
                  step: {
                    type: 'number',
                    desc: 'How many steps to forward, default is 0: unlimited to latest migration',
                    default: 0,
                  },
                });
            },
            handler() {},
          });
      },
      handler() {},
    })
    .demandCommand();
}
