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

/* global Plotly, generatedResults */
/* eslint-env browser */

const IGNORED_METRICS = ['Navigation Start'];

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

function generateStackedBarChart() {
  for (let i = 0; i < generatedResults["First Contentful Paint"].length; i++) {
    const data = [
      "First Contentful Paint",
      "First Meaningful Paint",
      "First Visual Change",
      "Visually Complete 85%",
      "Visually Complete 100%",
      "On Load",
      "Time to Interactive (vAlpha)",
      "Time to Interactive (vAlpha non-visual)",
      "Time to Interactive (vAlpha non-visual, 5s)",
      "End of Trace",
    ].map(metric => ({
      y: generatedResults[metric][i].metrics.map(m => m.timing),
      name: metric,
      type: "bar"
    }));

    var layout = { barmode: "group", title: generatedResults["First Contentful Paint"][i].site};
    Plotly.newPlot(createChartElement(), data, layout);
  }
}

generateStackedBarChart()
