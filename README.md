# Cypress Utils

#### Easily parallelize and stress-test your Cypress tests

Cypress Utils is a command-line interface for parallelizing and stress-testing your Cypress tests.

> To get started, just run `npx cypress-utils --help`.

![Example of running the `stress-test` command](./assets/stress-test-example.gif)

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
