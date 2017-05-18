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
  .describe('input', 'path to artifacts from measure.js (pass in a comma separated list)')
  .array('input')
  .argv;

const DevtoolsTimelineModel = require('../lighthouse-core/lib/traces/devtools-timeline-model');
const constants = require('./constants');
const utils = require('./utils');

const INPUT_PATHS = args['input'] ? getInputPaths(args['input']) : [constants.OUT_PATH];
const OUT_CSV_PATH = path.resolve(constants.OUT_PATH, 'cpu.csv');

function getInputPaths(inputs) {
  return inputs.map((p) => path.resolve(__dirname, p));
}

function main() {
  if (!utils.isDir(constants.OUT_PATH)) {
    fs.mkdirSync(constants.OUT_PATH);
  }

  const crossBatchResults = [];
  INPUT_PATHS.forEach((inputPath) => {
    debugger;
    const batchResults = [];
    fs.readdirSync(inputPath).forEach(siteDir => {
      const sitePath = path.resolve(inputPath, siteDir);
      if (!utils.isDir(sitePath)) {
        return;
      }
      const siteResult = {
        site: siteDir,
        results: analyzeSite(sitePath)
      };
      console.log('Analyzed', sitePath, '\n', siteResult.results); // eslint-disable-line no-console
      batchResults.push(siteResult);
    });
    crossBatchResults.push({
      batch: path.basename(inputPath),
      results: batchResults,
    });
  });
  writeToCSV(crossBatchResults);
}

main();

/**
 * @typedef {{batch: string, results: !Array<!SiteResults>}}
 */
let BatchResults; // eslint-disable-line no-unused-vars

/**
 *
 * @param {!!Array<BatchResults>} allResults
 */
function writeToCSV(batchResults) {
  // TODO: make sure it handles missing results properly
  const headers = new Set();
  const sitesMap = new Map();
  // const siteMap = new Map();
  const siteToken = '$Site$'
  headers.add(siteToken);
  // const siteMap = new Map();
  batchResults.forEach(({
    batch,
    results
  }) => {
    results.forEach(({
      site,
      results
    }) => {
      if (!sitesMap.has(site)) {
        const map = new Map();
        map.set(siteToken, site);
        sitesMap.set(site, map);
      }
      results.forEach(({
        runId,
        totalNonIdleTimeMs
      }) => {
        const header = `${batch}$$${runId}`;
        headers.add(header);
        const siteMap = sitesMap.get(site);
        siteMap.set(header, totalNonIdleTimeMs);
      });
    });
  });
  let outComponents = [Array.from(headers).join(',')];
  for (const siteMap of sitesMap.values()) {
    const lineComponents = [];
    for (const header of headers) {
      lineComponents.push(siteMap.get(header));
    }
    outComponents.push(lineComponents.join(','));
  }
  fs.writeFileSync(OUT_CSV_PATH, outComponents.join('\n'));
}

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

  const traceEvents = JSON.parse(fs.readFileSync(tracePath));
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
