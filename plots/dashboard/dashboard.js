/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
"use strict";

/* global Plotly, dashboardResults */
/* eslint-env browser */

// dashboardResults
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

const groupedByMetrics = Object.keys(
dashboardResults
).reduce((acc, batchId) => {
const batchResults = dashboardResults[batchId];
Object.keys(batchResults).forEach(metricId => {
    if (!acc[metricId]) {
    acc[metricId] = {};
    }
    const sites = batchResults[metricId];
    sites.forEach(site => {
    if (!acc[metricId][site.site]) {
        acc[metricId][site.site] = {};
    }
    acc[metricId][site.site][batchId] = site.metrics;
    });
});
return acc;
}, {});

function main() {
  const metrics = Object.keys(groupedByMetrics).filter(
    m => m !== "Navigation Start"
  );

  initializeSelectMetricControl(metrics);

  const currentMetric = metrics[0];
  generateChartsForMetric(currentMetric, groupedByMetrics);
}

main();

function initializeSelectMetricControl(metrics) {
    const metricsControl = document.getElementById('select-metric');
    for (const metric of metrics) {
        const option = document.createElement('option');
        option.label = metric;
        option.value = metric;
        metricsControl.appendChild(option);
    }
    metricsControl.addEventListener("change", onSelectMetric, false);
}

function onSelectMetric(event) {
    removeChildren(document.getElementById('charts'));
    generateChartsForMetric(event.target.value, groupedByMetrics);
}

function generateChartsForMetric(metric, groupedByMetrics) {
  for (const [name, site] of Object.entries(groupedByMetrics[metric])) {
    const batches = Object.values(site).map(batch => {
      return {
        y: batch.map(metric => metric.timing),
        type: "box"
      };
    });

    generateBoxPlot(batches, name);
  }
}

var layout = {
    width: 400,
    height: 300,
    xaxis: {
        showgrid: false,
        zeroline: false,
        tickangle: 60,
        showticklabels: false
    },
    yaxis: {
        zeroline: true,
        rangemode: "tozero"
    },
    showlegend: false,
    titlefont: {
        family: `"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif`,
        size: 14
    }
};

function generateBoxPlot(data, title) {
  enqueuePlot(_ => {
    Plotly.newPlot(createChartElement(), data, Object.assign({title}, layout));
  });
}

function createChartElement() {
  const div = document.createElement("div");
  div.style = "display: inline-block; position: relative";
  div.id = "chart" + elementId++;
  const button = document.createElement('button');
  button.className = 'dth-button show-bigger-button';
  button.appendChild(document.createTextNode('Focus'))
  button.addEventListener('click', onButtonClick, false);
  div.appendChild(button);

  const container = document.getElementById("charts");
  container.appendChild(div);
  return div.id;

  function onButtonClick(e) {
      document.body.appendChild('overlay');
  }
}

/**
 * @param {!Element} parent
 */
function removeChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}
