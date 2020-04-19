#!/usr/bin/env node
const yargs = require('yargs');

var argv = yargs.scriptName('cypress-utils')
  .usage('$0 <cmd> [args]')
  .example('$0 foo.spec.js', 'stress test the "foo" spec file')
  .example('$0 bar', 'stress test the matched `bar.spec.js` file')
  .command('$0 <fileIdentifier>', 'Stress test a Cypress spec file', (yargs) => {
    yargs
      .positional('fileIdentifier', {
        type: 'string',
        describe: 'A unique identifier for the spec file to test',
      })
      .option('threads', {
        alias: ['t', 'limit'],
        type: 'number',
        description: 'Maximum number of parallel test runners',
        default: 2,
      })
      .option('trialCount', {
        alias: ['n', 'count'],
        type: 'number',
        description: 'Number of trial attempts to run test',
        default: 4,
      })
  })
  .help()
  .alias('help', 'h')
  .demandCommand()
  .showHelpOnFail(true)
  .argv

console.log(`Command ran with args: ${argv}`);
