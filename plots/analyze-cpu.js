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

const log = require('../lighthouse-core/lib/log.js');
const DevtoolsTimelineModel = require('../lighthouse-core/lib/traces/devtools-timeline-model');
const constants = require('./constants');
const utils = require('./utils');

const INPUT_PATHS = args['input-root'] ? getInputPathsFromRoot(args['input-root']) : args['input'] ? getInputPaths(args['input']) : [constants.OUT_PATH];
const OUT_SUMMARY_CSV_PATH = path.resolve(constants.OUT_PATH, 'summary-cpu.csv');
const OUT_DETAILED_CSV_PATH = path.resolve(constants.OUT_PATH, 'detailed-cpu.csv');

console.log('INPUT_PATHS', INPUT_PATHS);

// Code copied from TimelineUIUtils.js
/**
 * @param {!WebInspector.TimelineModel} model
 * @param {number} startTime
 * @param {number} endTime
 * @return {!Object<string, number>}
 */
WebInspector.TimelineUIUtils.statsForTimeRange = function(model, startTime, endTime)
{
    var aggregatedStats = {};

    /**
     * @param {number} value
     * @param {!WebInspector.TimelineModel.Record} task
     * @return {number}
     */
    function compareEndTime(value, task)
    {
        return value < task.endTime() ? -1 : 1;
    }
    var mainThreadTasks = model.mainThreadTasks();
    var taskIndex = mainThreadTasks.lowerBound(startTime, compareEndTime);
    for (; taskIndex < mainThreadTasks.length; ++taskIndex) {
        var task = mainThreadTasks[taskIndex];
        if (task.startTime() > endTime)
            break;
        if (task.startTime() > startTime && task.endTime() < endTime) {
            // cache stats for top-level entries that fit the range entirely.
            var taskStats = task[WebInspector.TimelineUIUtils._aggregatedStatsKey];
            if (!taskStats) {
                taskStats = {};
                WebInspector.TimelineUIUtils._collectAggregatedStatsForRecord(task, startTime, endTime, taskStats);
                task[WebInspector.TimelineUIUtils._aggregatedStatsKey] = taskStats;
            }
            for (var key in taskStats)
                aggregatedStats[key] = (aggregatedStats[key] || 0) + taskStats[key];
            continue;
        }
        WebInspector.TimelineUIUtils._collectAggregatedStatsForRecord(task, startTime, endTime, aggregatedStats);
    }

    var aggregatedTotal = 0;
    for (var categoryName in aggregatedStats)
        aggregatedTotal += aggregatedStats[categoryName];
    aggregatedStats["idle"] = Math.max(0, endTime - startTime - aggregatedTotal);
    return aggregatedStats;
}


function getInputPathsFromRoot(inputRoot) {
  return fs.readdirSync(path.resolve(__dirname, inputRoot)).map((p) => path.resolve(__dirname, inputRoot, p));
}

function getInputPaths(inputs) {
  return inputs.map((p) => path.resolve(__dirname, p));
}

function main() {
  log.setLevel('verbose');
  if (!utils.isDir(constants.OUT_PATH)) {
    fs.mkdirSync(constants.OUT_PATH);
  }

  const crossBatchResults = [];
  INPUT_PATHS.forEach((inputPath) => {
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
      batchResults: batchResults,
    });
  });
  writeSummaryCSV(crossBatchResults);
  writeDetailedCSV(crossBatchResults);
}

main();

/**
 * @typedef {{batch: string, batchResults: !Array<!SiteResults>}}
 */
let BatchResults; // eslint-disable-line no-unused-vars

/**
 *
 * @param {!!Array<BatchResults>} allResults
 */
function writeSummaryCSV(batchResults) {
  // TODO: make sure it handles missing results properly
  const headers = new Set();
  const sitesMap = new Map();
  // const siteMap = new Map();
  const siteToken = '$Site$'
  headers.add(siteToken);
  // const siteMap = new Map();
  batchResults.forEach(({
    batch,
    batchResults
  }) => {
    batchResults.forEach(({
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
  fs.writeFileSync(OUT_SUMMARY_CSV_PATH, outComponents.join('\n'));
}

/*
 * @param {!!Array<BatchResults>} allResults
 */
function writeDetailedCSV(batchResults) {
  const headers = [
    'Site',
    'Batch',
    'Run Number',
    'loading',
    'scripting',
    'rendering',
    'painting',
    'gpu',
    'other',
    'idle',
    'Total non-idle CPU time',
    'Total CPU time',
    'ISSUES',
  ];
  const lines = [headers];
  batchResults.forEach(({
    batch,
    batchResults
  }) => {
    batchResults.forEach(({
      site,
      results
    }) => {
      results.forEach(({
        runId,
        totalNonIdleTimeMs,
        totalTimeMs,
        aggregatedStats,
        logCount
      }) => {
        lines.push([
          site,
          batch,
          runId,
          aggregatedStats['loading'],
          aggregatedStats['scripting'],
          aggregatedStats['rendering'],
          aggregatedStats['painting'],
          aggregatedStats['gpu'],
          aggregatedStats['other'],
          aggregatedStats['idle'],
          totalNonIdleTimeMs,
          totalTimeMs,
          logCount,
        ]);
      });
    });
  });
  let outComponents = lines.map((r) => r.join(','));
  // for (const siteMap of sitesMap.values()) {
  //   const lineComponents = [];
  //   for (const header of headers) {
  //     lineComponents.push(siteMap.get(header));
  //   }
  //   outComponents.push(lineComponents.join(','));
  // }
  fs.writeFileSync(OUT_DETAILED_CSV_PATH, outComponents.join('\n'));
}

/**
 * Aggregates all the run results for a particular site.
 * @param {string} sitePath
 * @return {!RunResults}
 */
function analyzeSite(sitePath) {
  const runResults = [];
  console.log('analyzeSite', sitePath);
  fs.readdirSync(sitePath).forEach(runDir => {
    const tracePath = path.resolve(sitePath, runDir, constants.TRACE_FILENAME);
    if (!utils.isFile(tracePath)) {
      return;
    }
    console.log('runDir', runDir);
    const traceEvents = JSON.parse(fs.readFileSync(tracePath));
    const model = new DevtoolsTimelineModel(traceEvents);
    const stats = getAggregatedStats(model);
    const totalTimeMs = Object.keys(stats).reduce((acc, key) => acc += stats[key], 0);
    const totalNonIdleTimeMs = getTotalNonIdleTimeMsFromTrace(model);

    const sanityCheckTotalNonIdleTimeMs = totalTimeMs - stats['idle'];

    if (sanityCheckTotalNonIdleTimeMs !== totalNonIdleTimeMs) {
      console.log('Sanity check for TotalNonIdleTimeMs - please look at trace file:', tracePath);
    }

    const logCount = model.logCount()

    runResults[runDir] = {
      runId: runDir,
      totalNonIdleTimeMs: logCount === 0 ? totalNonIdleTimeMs : null,
      aggregatedStats: stats,
      totalTimeMs: totalTimeMs,
      logCount: logCount,
    };
  });
  return runResults;
}

/**
 * @param {#} model
 * @return {number}
 */
function getTotalNonIdleTimeMsFromTrace(model) {
  const tasks = model.timelineModel().mainThreadTasks();
  return tasks.reduce((acc, task) => {
    return acc + (task.traceEvent().duration || 0)
  }, 0);
}

/**
 * @param {#} model
 * @return {number}
 */
function getAggregatedStats(model) {
  const startTime = model.timelineModel().minimumRecordTime();
  const endTime = model.timelineModel().maximumRecordTime();
  const timelineModel = model.timelineModel();
  return WebInspector.TimelineUIUtils.statsForTimeRange(timelineModel, startTime, endTime);
}

/**
 * @typedef {{site: string, results: !CpuResults}}
 */
let SiteResults; // eslint-disable-line no-unused-vars

/**
 * @typedef {!Array<{runId: string, totalNonIdleTimeMs: number}>}
 */
let CpuResults; // eslint-disable-line no-unused-vars
