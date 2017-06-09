/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
"use strict";
const childProcess = require('child_process');
const fs = require("fs");
const path = require("path");

const args = require("yargs")
  .describe({
    input: "path to artifacts from measure.js (pass in comma separated list)",
    "input-root":
      "path to directory where every sub-directory is used as an input"
  })
  .array("input")
  .argv;

const constants = require("./constants");
const utils = require("./utils");
/**
 * Run analyze.js on each of the outs
 */
function main() {
  const inputPaths = getInputPaths();
  analyzeEachInputPath(inputPaths);

  const results = {};
  for (const inputPath of inputPaths) {
    const result = fs.readFileSync(path.resolve(inputPath, constants.GENERATED_RESULTS_FILENAME), 'utf-8');
    results[path.basename(inputPath)] = JSON.parse(result.replace('var generatedResults = ', ''));
  }
  if (!utils.isDir(constants.OUT_PATH)) {
    fs.mkdirSync(constants.OUT_PATH);
  }
  fs.writeFileSync(path.resolve(constants.OUT_PATH, 'dashboard-results.js'), `const dashboardResults = ${JSON.stringify(results, undefined, 2)}`);
}

main();

/**
 * @param {!Array<string>} inputPaths
 */
function analyzeEachInputPath(inputPaths) {
  for (const input of inputPaths) {
    childProcess.execSync(`node analyze.js ${input}`, {
      env: Object.assign({}, process.env, {
        CI: '1',
      })
    });
  }
}

/**
 * @param {!Array<string>} inputPaths
 */
function aggregateResults(inputPaths) {

}

/**
 * Returns a list of out paths generated by measure.js
 * @return {!Array<string>}
 */
function getInputPaths() {
  if (args.inputRoot) {
    return fs
    .readdirSync(path.resolve(__dirname, args.inputRoot))
    .map(pathComponent => path.resolve(__dirname, args.inputRoot, pathComponent));
  }
  if (args.input) {
    return args.input.map(p => path.resolve(__dirname, p));
  }
  console.log('ERROR: must pass in --input-root or --input (see --help for more info)');
  process.exit(1);
}

/**
 * @typedef {{site: string, results: !RunResults}}
 */
let SiteResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {!Array<{runId: string, metrics: !Array<!Metric>}>}
 */
let RunResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {{name: string, id: string, timing: number}}
 */
let Metric; // eslint-disable-line no-unused-vars

/**
 * @typedef {!Object<string, !Array<{site: string, metrics: !Array<{timing: number}>}>}
 */
let ResultsByMetric; // eslint-disable-line no-unused-vars

/**
 * Per site dashboard
 * By metric
 *  By site
 *   By batch
 *     By run
 *     10%ile median 90%ile
 */
