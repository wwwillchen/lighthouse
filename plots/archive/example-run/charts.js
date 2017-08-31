/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* global Plotly, generatedResults */
/* eslint-env browser */

const IGNORED_METRICS = new Set(['Navigation Start']);

const metrics = Object.keys(generatedResults).filter(metric => !IGNORED_METRICS.has(metric));

let elementId = 1;

/**
 * Incrementally renders the plot, otherwise it hangs the browser
 * because it's generating so many charts.
 */
const queuedPlots = [];
function enqueuePlot(fn) {
  const isFirst = queuedPlots.length == 0;
  queuedPlots.push(fn);
  if (isFirst) {
    renderPlots();
  }
}
function renderPlots() {
  window.requestAnimationFrame(_ => {
    const plotFn = queuedPlots.shift();
    if (plotFn) {
      plotFn();
      renderPlots();
    }
  });
}


function createChartElement(height = 800) {
  const div = document.createElement('div');
  div.style = `width: 100%; height: ${height}px`;
  div.id = 'chart' + elementId++;
  document.body.appendChild(div);
  return div.id;
}

/**
 * Generates a blox plot chart for each performance metric.
 * If there's a lot of sites, it renders them in separate charts
 * otherwise it's too hard to read the chart.
 */
// eslint-disable-next-line no-unused-vars
function generateBoxPlotChartPerMetric() {
  for (const metric in generatedResults) {
    if (IGNORED_METRICS.has(metric)) {
      continue;
    }
    generateBoxPlotChartByBatch({metric, type: 'timing'});
  }

  function generateBoxPlotChartByBatch({metric, type}) {
    const width = 30;
    for (let i = 0; i < generatedResults[metric].length; i += width) {
      generateBoxPlotChart({
        title: metric,
        data: generatedResults[metric].slice(i, i + width),
        type: type
      });
    }
  }

  function generateBoxPlotChart({title, data, type}) {
    data = data
      .map(siteResult => {
        return {
          x: siteResult.metrics.map(m => m ? m[type] : null),
          type: 'box',
          name: siteResult.site,
          boxpoints: 'all',
          jitter: 0.9,
          pointpos: -2,
          hoverinfo: 'x+name'
        };
      })
      .reverse(); // see: https://github.com/plotly/plotly.js/issues/1187

    const layout = {
      title: title + ' ' + type,
      legend: {
        traceorder: 'reversed'
      },
      xaxis: {
        rangemode: 'tozero'
      },
      margin: {
        l: 150
      }
    };
    enqueuePlot(_ => {
      Plotly.newPlot(createChartElement(1000), data, layout);
    });
  }
}

/**
 * Generates a line plot chart for each performance metric.
 * If there's a lot of sites, it renders them in separate charts
 * otherwise it's too hard to read the chart.
 */
// eslint-disable-next-line no-unused-vars
function generateLinePlotChartPerMetric() {
  for (const metric in generatedResults) {
    if (IGNORED_METRICS.has(metric)) {
      continue;
    }
    generateLinePlotByBatch({metric, type: 'timing'});
  }

  function generateLinePlotByBatch({metric, type}) {
    const width = 20;
    for (let i = 0; i < generatedResults[metric].length; i += width) {
      generateLinePlot({
        title: metric,
        data: generatedResults[metric].slice(i, i + width),
        type: type
      });
    }
  }

  function generateLinePlot({title, data, type}) {
    data = data.map(siteResult => ({
      name: siteResult.site,
      y: siteResult.metrics.map(m => m ? m[type] : null),
      type: 'scatter'
    }));

    const layout = {
      title: title + ' ' + type,
      yaxis: {
        rangemode: 'tozero'
      }
    };
    enqueuePlot(_ => {
      Plotly.newPlot(createChartElement(), data, layout);
    });
  }
}

// eslint-disable-next-line no-unused-vars
function generateBoxPlotPerSite() {
  const sitesCount = metrics.reduce(
    (acc, metric) => Math.max(acc, generatedResults[metric].length), 0);
  for (let i = 0; i < sitesCount; i++) {
    const data = metrics
      .map(metric => ({
        x: generatedResults[metric][i].metrics.map(m => m ? m.timing : null),
        name: metric,
        type: 'box',
        boxpoints: 'all',
        jitter: 0.9,
        pointpos: -2,
        hoverinfo: 'x+name'
      }))
      .reverse(); // see: https://github.com/plotly/plotly.js/issues/1187

    const layout = {
      xaxis: {
        rangemode: 'tozero'
      },
      legend: {
        traceorder: 'reversed'
      },
      title: generatedResults[metrics[0]][i].site,
      margin: {
        l: 250
      }
    };
    enqueuePlot(_ => {
      Plotly.newPlot(createChartElement(), data, layout);
    });
  }
}

// eslint-disable-next-line no-unused-vars
function generateGroupedBarChart() {
  const sitesCount = metrics.reduce(
    (acc, metric) => Math.max(acc, generatedResults[metric].length),
    0
  );
  for (let i = 0; i < sitesCount; i++) {
    const data = metrics.map(metric => ({
      y: generatedResults[metric][i].metrics.map(m => m ? m.timing : null),
      name: metric,
      type: 'bar'
    }));

    const layout = {
      yaxis: {
        rangemode: 'tozero'
      },
      hovermode: 'closest',
      barmode: 'group',
      title: generatedResults[metrics[0]][i].site
    };
    enqueuePlot(_ => {
      Plotly.newPlot(createChartElement(), data, layout);
    });
  }
}
