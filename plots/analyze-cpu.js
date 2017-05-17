/**
 * @license
 * Copyright 2017 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 *
 * Load it the first time but discard results - warm up the Network cache
 * Disable CPU cache
 */
const fs = require('fs');
const path = require('path');

const args = require('yargs')
  .describe('input', 'path to artifacts from measure.js')
  .argv;

const DevtoolsTimelineModel = require('../lighthouse-core/lib/traces/devtools-timeline-model');
const constants = require('./constants');
const utils = require('./utils');

const INPUT_PATH = args['input'] ? path.resolve(__dirname, args['input']) : constants.OUT_PATH;

function main () {
  const allResults = [];
  fs.readdirSync(INPUT_PATH).forEach(siteDir => {
    const sitePath = path.resolve(INPUT_PATH, siteDir);
    if (!utils.isDir(sitePath)) {
      return;
    }
    const siteResult = {
      site: siteDir,
      results: analyzeSite(sitePath)
    };
    console.log('Analyzed', sitePath, '\n', siteResult.results); // eslint-disable-line no-console
    allResults.push(siteResult);
  });
}

main();

/**
 * Aggregates all the run results for a particular site.
 * @param {string} sitePath
 * @return {!RunResults}
 */
function analyzeSite(sitePath) {
  const runResults = [];
  fs.readdirSync(sitePath).forEach(runDir => {
    const tracePath = path.resolve(sitePath, runDir, constants.TRACE_FILENAME);
    if (!utils.isFile(tracePath)) {
      return;
    }
    runResults[runDir] = {
      runId: runDir,
      totalNonIdleTimeMs: getTotalNonIdleTimeMsFromTrace(tracePath),
    };
  });
  return runResults;
}

/**
 * @param {string} tracePath
 * @return {number}
 */
function getTotalNonIdleTimeMsFromTrace(tracePath) {
  const traceEvents = require(tracePath);
  const model = new DevtoolsTimelineModel(traceEvents);
  const tasks = model.timelineModel().mainThreadTasks();
  return tasks.reduce((acc, task) => {
    return acc + (task.traceEvent().duration || 0)
  }, 0);
}

/**
 * @typedef {{site: string, results: !CpuResults}}
 */
let SiteResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {!Array<{runId: string, totalNonIdleTimeMs: number}>}
 */
let CpuResults; // eslint-disable-line no-unused-vars
