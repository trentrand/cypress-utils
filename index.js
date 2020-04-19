#!/usr/bin/env node
const fs = require('fs');
const yargs = require('yargs');
const cypress = require('cypress');
const cypressConfig = require('../cypress.json');

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

// Read user-specified spec files from filesystem
const specFiles = fs.readdirSync(cypressConfig.integrationFolder)
  .filter(fileName => fileName.toLowerCase().includes(argv.fileIdentifier))
  .map(fileName => `${cypressConfig.integrationFolder}/${fileName}`);

try {
  const results = await cypress.run({
    ...cypressConfig,
    spec: specFiles.join(','),
    reporter: 'list'
  });
  return results;
}
catch (error) {
  throw error;
}
