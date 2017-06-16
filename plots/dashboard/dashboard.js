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

let currentMetric;
let numberOfPoints = 0;

function main() {
  const metrics = Object.keys(groupedByMetrics).filter(
    m => m !== "Navigation Start"
  );

  initializeSelectMetricControl(metrics);
  initializeSelectNumberOfPoints();

  currentMetric = metrics[0];
  generateChartsForMetric();
}

main();

function initializeSelectNumberOfPoints() {
  const control = document.getElementById("select-number-of-points");
  control.addEventListener("change", onSelectNumberOfPoints, false);
}

function onSelectNumberOfPoints(event) {
  if (event.target.value === "all") {
    numberOfPoints = 0;
  } else {
    numberOfPoints = parseInt(event.target.value, 10);
  }
  removeChildren(document.getElementById("charts"));
  generateChartsForMetric();
}

function initializeSelectMetricControl(metrics) {
  const metricsControl = document.getElementById("select-metric");
  for (const metric of metrics) {
    const option = document.createElement("option");
    option.label = metric;
    option.value = metric;
    metricsControl.appendChild(option);
  }
  metricsControl.addEventListener("change", onSelectMetric, false);
}

function onSelectMetric(event) {
  removeChildren(document.getElementById("charts"));
  currentMetric = event.target.value;
  generateChartsForMetric();
}

function generateChartsForMetric() {
  const metric = currentMetric;
  for (const [name, site] of Object.entries(groupedByMetrics[metric])) {
    const XYs = Object.entries(site)
      .map(([batchName, batch], index) => {
        return {
          x: batchName,
          median: percentile(batch.map(metric => metric.timing), 0.5),
          higher: percentile(batch.map(metric => metric.timing), 0.8),
          lower: percentile(batch.map(metric => metric.timing), 0.2)
        };
      })
      .slice(-1 * numberOfPoints);

    const median = {
      x: XYs.map(r => r.x),
      y: XYs.map(r => r.median),
      type: "scatter",
      mode: "line",
      name: "median"
    };
    const upper = {
      x: XYs.map(r => r.x).concat(XYs.map(r => r.x).reverse()),
      y: XYs.map(r => r.higher).concat(XYs.map(r => r.lower).reverse()),
      fill: "toself",
      fillcolor: "rgba(0,176,246,0.2)",
      line: { color: "transparent" },
      name: "error bands",
      showlegend: false,
      type: "scatter"
    };
    const data = [median, upper];
    generateSmallChart(data, name);
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

function generateSmallChart(data, title) {
  enqueuePlot(_ => {
    Plotly.newPlot(
      createSmallChartElement(data, title),
      data,
      Object.assign({ title }, layout)
    );
  });
}

function generateBigChart(data, title, element) {
  Plotly.newPlot(
    element,
    data,
    Object.assign({ title }, layout, {
      width: document.body.clientWidth - 100,
      height: 500
    })
  );
}

function createSmallChartElement(data, title) {
  const chart = createChartElement();
  const button = document.createElement("button");
  button.className = "dth-button show-bigger-button";
  button.appendChild(document.createTextNode("Focus"));
  button.addEventListener("click", onFocusChart, false);
  chart.appendChild(button);

  const container = document.getElementById("charts");
  container.appendChild(chart);
  return chart.id;

  function onFocusChart(e) {
    const overlay = document.createElement("div");
    overlay.id = "overlay";
    document.body.appendChild(overlay);

    document.getElementById("charts").style.display = "none";

    const closeButton = document.createElement("button");
    closeButton.className = "dth-button close-button";
    closeButton.appendChild(document.createTextNode("Close"));
    closeButton.addEventListener("click", onClose, false);
    overlay.appendChild(closeButton);

    const chart = document.createElement("div");
    chart.className = "chart";
    overlay.appendChild(chart);
    generateBigChart(data, title, chart);

    function onClose() {
      document.getElementById("charts").style.display = "block";
      document.body.removeChild(overlay);
    }
  }
}

function createChartElement() {
  const div = document.createElement("div");
  div.style = "display: inline-block; position: relative";
  div.id = "chart" + elementId++;
  return div;
}

/**
 * @param {!Element} parent
 */
function removeChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

/**
 * Calculate the value at a given percentile
 * Based on: https://gist.github.com/IceCreamYou/6ffa1b18c4c8f6aeaad2
 * @param {!Array<number>} array
 * @param {number} percentile should be from 0 to 1
 */
function percentile(array, percentile) {
  if (array.length === 0) {
    return 0;
  }
  if (percentile <= 0) {
    return array[0];
  }
  if (percentile >= 1) {
    return array[array.length - 1];
  }
  const sorted = array.slice().sort((a, b) => a - b);

  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;

  if (upper >= sorted.length) {
    return sorted[lower];
  }
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
