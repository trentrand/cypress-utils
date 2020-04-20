#!/usr/bin/env node
const fs = require('fs');
const { performance } = require('perf_hooks');
const path = require('path');
const yargs = require('yargs');
const timesLimit = require('async/timesLimit');
const groupBy = require('lodash/groupBy');
const cypress = require('cypress');

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
      .option('configFile', {
        alias: ['c', 'config'],
        type: ['string', 'boolean'],
        description: 'Path to the config file to be used. If false is passed, no config file will be used.',
        default: 'cypress.json',
      })
      .option('integrationFolder', {
        alias: ['i', 'integration'],
        type: 'string',
        description: 'Path to folder containing integration test files',
        default: 'cypress/integration',
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
      config: (argv.configFile === false ? {} : cypressConfig),
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
  const processEndTime = performance.now();
  const elapsedTimeInSeconds = parseInt((processEndTime - processStartTime) / 1000);
  console.log(`Stress test completed in ${elapsedTimeInSeconds} seconds.\n`);

  const formattedResults = computeResults(results);

  Object.entries(formattedResults).forEach(([subjectName, subjectResults]) => {
    console.log(`Results for '${subjectName}' test:\n`);
    console.table({ Results: subjectResults });
  });
}

// Keep track of elapsed time
const processStartTime = performance.now();

// Initialize the Cypress runner configuration
let cypressConfig = {};

try {
  // Passing `--configFile false` will explicitly _not_ attempt to load a configuration file
  if (argv.configFile !== 'false') {
    cypressConfig = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), argv.configFile), 'utf8')) || {};
  }

  // Fall-back to option `--integrationFolder` if it doesn't exist in the config
  cypressConfig.integrationFolder = cypressConfig.integrationFolder || argv.integrationFolder;

} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn(`
      Could not load a Cypress configuration at path: \`${argv.configFile}\`

      Specify the path to your configuration with the \`--configFile\` command-line option,
      or run this command from the appropriate working directory.`.replace(/  +/g, '')
    );

    if (argv.integrationFolder === undefined) {
      console.warn(`
        Without a configuration file, a path to your integration folder must be explicitly
        provided using the \`--integrationFolder\` command-line option.`.replace(/  +/g, '')
      );
      return;
    }
  } else {
    console.error(err)
  }
}

// Read user-specified spec files from filesystem
let specFiles;

try {
  specFiles = fs.readdirSync(cypressConfig.integrationFolder)
    .filter(fileName => fileName.toLowerCase().includes(argv.fileIdentifier))
    .map(fileName => `${cypressConfig.integrationFolder}/${fileName}`);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn(`
      Could not load Cypress spec files at path: \`${cypressConfig.integrationFolder}\`

      Specify the path to your test files with the \`--integrationFolder\` command-line option,
      or use the path specified in your Cypress configuration file.

      See the \`--configFile\` command-line option.`.replace(/  +/g, '')
    );
  } else {
    console.error(err)
  }
  return;
}

// Run stress-test command
timesLimit(argv.trialCount, argv.limit, createTestSample, printResults);
