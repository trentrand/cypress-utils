#!/usr/bin/env node
const fs = require('fs');
const { performance } = require('perf_hooks');
const path = require('path');
const yargs = require('yargs');
const mapLimit = require('async/mapLimit');
const capitalize = require('lodash/capitalize');
const castArray = require('lodash/castArray');
const groupBy = require('lodash/groupBy');
const cypress = require('cypress');
const glob = require('glob');
const minimatch = require('minimatch');

var argv = yargs.scriptName('cypress-utils')
  .usage('$0 <cmd> [args]')
  .example('$0 stress-test foo.spec.js', 'stress test the "foo" spec file')
  .example('$0 stress-test bar', 'stress test the matched `bar.spec.js` file')
  .command('run-parallel [fileIdentifiers..]', 'Parallelize your local Cypress run', (yargs) => {
    yargs
      .positional('fileIdentifiers', {
        type: 'string',
        describe: 'A unique identifier for the spec file to test.\nIf not specified, all spec files will be ran.',
        default: '',
      });
  })
  .command('stress-test [fileIdentifiers..]', 'Stress test a Cypress spec file', (yargs) => {
    yargs
      .positional('fileIdentifiers', {
        type: 'string',
        describe: 'A unique identifier for the spec file to test',
        default: '',
      })
      .option('trialCount', {
        alias: ['n', 'count'],
        type: 'number',
        description: 'Number of trial attempts to run test',
        default: 4,
      });
  })
  .option('threads', {
    alias: ['t', 'limit'],
    type: 'number',
    description: 'Maximum number of parallel test runners',
    default: 2,
    global: true,
  })
  .option('configFile', {
    alias: ['C', 'config-file'],
    type: 'string',
    description: 'Path to the config file to be used.\nIf false is passed, no config file will be used.',
    default: 'cypress.config.js',
    global: true,
  })
  .option('config', {
    alias: ['c', 'config'],
    type: 'string',
    description: 'Set configuration values. Separate multiple values with commas. The values set here override any values set in your configuration file.',
    global: true,
  })
  .option('specPattern', {
    alias: ['i', 'integration'],
    type: 'string',
    description: 'A glob pattern of the test files to load.',
    default: 'cypress/e2e',
    global: true,
  })
  .option('excludeSpecPattern', {
    type: 'array',
    default: [],
    description: 'Array with the list of the files to exclude',
    global: true,
  })
  .option('testFiles', {
    type: 'string',
    description: 'Glob pattern of the test files to load',
    global: true,
  })
  .help()
  .alias('help', 'h')
  .demandCommand()
  .showHelpOnFail(true)
  .wrap(Math.min(120, yargs.terminalWidth))
  .argv;

async function createTestSample(specIdentifiers) {
  try {
    const results = await cypress.run({
      ...argv,
      config: argv.config,
      configFile: argv.configFile,
      spec: castArray(specIdentifiers).join(','),
      quiet: true,
    });
    return results;
  }
  catch (error) {
    throw error;
  }
}

function resultIsSuccess(result) {
  return result.failures === undefined;
}

function computeResults(results) {
  const processedResults = results.filter(resultIsSuccess).map(({ runs }) => runs).flat();

  const resultsBySubject = groupBy(processedResults, (result) => {
    return result.spec.name.split('.')[0];
  });

  return Object.entries(resultsBySubject).reduce((statsBySubject, [subjectName, subjectResults]) => {
    statsBySubject[subjectName] = subjectResults.reduce((subjectStats, { stats: sampleStats }) => {
      for (let statIdentifier in sampleStats) {
        // Filter out the wall clock attributes, these don't sum correctly because tests can run in parallel
        if (statIdentifier === 'startedAt' || statIdentifier === 'endedAt' || statIdentifier === 'duration') {
          continue;
        }
        // Also filter out the `suites` property. This property does not provide value to the results
        if (statIdentifier === 'suites') {
          continue;
        }

        subjectStats[statIdentifier] = (subjectStats[statIdentifier] || 0) + sampleStats[statIdentifier];
      }
      return subjectStats;
    }, {});
    return statsBySubject;
  }, {});
}


function handleResults(error, results) {
  if (error) {
    throw error;
  }

  // Clear command-line before printing results
  process.stdout.write('\033c');

  const processEndTime = performance.now();
  const elapsedTimeInSeconds = parseInt((processEndTime - processStartTime) / 1000);

  console.log(`Command completed in ${elapsedTimeInSeconds} seconds.\n`);

  const formattedResults = computeResults(results);

  Object.entries(formattedResults).forEach(([subjectName, subjectResults]) => {
    printResultsForCommand(subjectName, subjectResults, command);
  });
}

function formatTableData(tableData) {
  return {
    Results: Object.fromEntries(Object.entries(tableData).map(([key, value]) => [capitalize(key), value]))
  };
}

function printResultsForCommand(subjectName, subjectResults, command) {
  switch (command) {
    case 'stress-test':
      console.log(`\nResults for ${argv.trialCount} samples of the '${subjectName}' test:\n`);
      break;
    case 'run-parallel':
      console.log(`\nResults for the '${subjectName}' test:\n`);
      break;
  }

  console.table(formatTableData(subjectResults));
}

// Keep track of elapsed time
const processStartTime = performance.now();

// Verify if the testFiles argv exists, otherwise use the default value
argv.testFiles = argv.testFiles || '**/*.*';

// Read user-specified spec files from filesystem
let specFiles;

argv.fileIdentifiers = castArray(argv.fileIdentifiers);
try {
  specFiles = glob.sync(argv.specPattern + '/' + argv.testFiles)
    .filter(fileName => {
      return (
        argv.fileIdentifiers.some((fileIdentifier) => fileName.toLowerCase().includes(fileIdentifier))
      );
    });
  if (argv.excludeSpecPattern.length > 0) {
    const MINIMATCH_OPTIONS = { dot: true, matchBase: true };
    specFiles = specFiles.filter(specFile =>
      !argv.excludeSpecPattern.some(excludePattern =>
        minimatch(specFile, excludePattern, MINIMATCH_OPTIONS)
      )
    );
  }
} catch (err) {
  if (err.code === 'ENOENT') {
    console.warn(`
      Could not load Cypress spec files at path: \`${argv.specPattern}\`

      Specify the path to your test files with the \`--specPattern\` command-line option,
      or ensure your Cypress configuration file is specified and setup correctly.

      See the \`--configFile\` command-line option.`.replace(/  +/g, '')
    );
  } else {
    console.error(err);
  }
  return;
}

if (specFiles.length === 0) {
  console.warn(`
    No Cypress spec files were found. You may have specified invalid file identifiers.

    The following file identifiers were provided: ${argv.fileIdentifiers.map((id => `"${id}"`)).join(', ')}

    Your configuration specifies that test files are contained within the following directory:
    \`${argv.specPattern}\`

    See help for the \`--specPattern\` command-line option if this is incorrect.`.replace(/  +/g, '')
  );
  return;
}

const command = argv._[0];

const commandHandlers = {
  'run-parallel': () => mapLimit(specFiles, argv.limit, createTestSample, handleResults),
  'stress-test': () => {
    const repeatedSpecFiles = Array(argv.trialCount).fill(specFiles).flat();
    return mapLimit(repeatedSpecFiles, argv.limit, createTestSample, handleResults);
  },
};

// Run the appropriate command by calling its handler
commandHandlers[command]();
