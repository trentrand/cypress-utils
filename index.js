#!/usr/bin/env node
const fs = require('fs');
const yargs = require('yargs');
const timesLimit = require('async/timesLimit');
const groupBy = require('lodash/groupBy');
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

async function createTestSample() {
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
}

function computeResults(results) {
  const resultsBySubject = groupBy(results.map(({ runs }) => runs).flat(), (result) => {
    return result.spec.name.replace('.spec.js', '');
  });

  return Object.entries(resultsBySubject).reduce((statsBySubject, [subjectName, subjectResults]) => {
    statsBySubject[subjectName] = subjectResults.reduce((subjectStats, { stats: sampleStats }) => {
        for (let statIdentifier in sampleStats) {
            // Filter out the wall clock attributes, these don't sum correctly because tests can run in parallel
            // Also filter out the `suites` property. This property does not provide value to the results.
            if (statIdentifier.startsWith('wallClock') || statIdentifier === 'suites') {
              continue;
            }

            subjectStats[statIdentifier] = (subjectStats[statIdentifier] || 0) + sampleStats[statIdentifier];
        }
        return subjectStats;
    }, {});
    return statsBySubject;
  }, {});
}

function printResults(error, results) {
  if (error) {
    throw error;
  }

  const elapsedTimeInSeconds = parseInt(console.timeLog('elapsedTime')) / 1000;
  console.log(`Stress test completed in ${elapsedTimeInSeconds} seconds`);

  const formattedResults = computeResults(results);

  Object.entries(formattedResults).forEach(([subjectName, subjectResults]) => {
    console.log(`Results for '${subjectName}' test:`);
    console.table({ Results: subjectResults });
  });
}

// Keep track of elapsed time
console.time('elapsedTime');

// Read user-specified spec files from filesystem
const specFiles = fs.readdirSync(cypressConfig.integrationFolder)
  .filter(fileName => fileName.toLowerCase().includes(argv.fileIdentifier))
  .map(fileName => `${cypressConfig.integrationFolder}/${fileName}`);

// Run stress-test command
timesLimit(argv.trialCount, argv.limit, createTestSample, printResults);
