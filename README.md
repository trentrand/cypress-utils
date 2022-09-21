# Cypress Utils

#### Easily parallelize and stress-test your Cypress tests

Cypress Utils is a command-line interface for parallelizing and stress-testing your Cypress tests.

To get started, just run `npx cypress-utils --help`.

## Commands

### Run tests in parallel

To speed up day-to-day local Cypress test runs (e.g. before committing changes to a branch), multiple Cypress test runners can be ran in parallel.
The impact on system resources is surprisingly manageable, even with multiple concurrent runners.

In my unscientific n=1 sample size of running an entire suite, specifying two concurrent test runners provided the best results.

> The total elapsed time was reduced by 38% when running a set of 12 tests in two concurrent threads

To run the entire suite in parallel, exclude any additional command-line arguments:

  ```shell
    cypress-utils run-parallel
  ```

Use the command-line option `excludeSpecPattern` to exclude specific files.

  ```shell
    cypress-utils run-parallel --excludeSpecPattern *.hot-update.js	
  ```

To run two or more specific test files in parallel, just specify the files to run:

  ```shell
    cypress-utils run-parallel specFileA.cy.js specfileB.cy.js
  ```

> See more command-line options with `cypress-utils run-parallel --help`

#### Example of running tests in parallel:
![Example of running the run parallel command](assets/run-parallel-example.gif)

### Stress test

To ensure your Cypress tests are not irregularly failing with false-negatives, stress testing new test files can be a reliable way of filtering out bad test code.

To stress test one or more test files, simply specify the files to run:

  ```shell
    cypress-utils stress-test specFileA specfileB
  ```

Additional command-line options may be specified, such as the sample size or number of concurrent threads:
  ```shell
   cypress-utils stress-test --trialCount 12 --threads 4
  ```

> See more command-line options with `cypress-utils stress-test --help`

#### Example of stress testing:
![Example of running the stress test command](assets/stress-test-example.gif)

## Installation

Install Cypress Utils to your project as a development dependency:

  ```shell
  npm install --save-dev cypress-utils
  ```

Or run it once with the node package runner:

  ```shell
  npx cypress-utils --help
  ```

## Development Setup

1. Clone the repository:

  ```shell
  git clone https://github.com/trentrand/cypress-utils.git
  ```

2. Install package dependencies:

  ```shell
  cd /path/to/cypress-utils
  npm install
  ```

3. Make `cypress-utils` globally executable:

  ```shell
  npm link
  ```

Cypress Utils are now executable globally with the command `cypress-utils`.
