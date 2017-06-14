/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env browser */

const CHART_TYPES = {
  'grouped-by-metric': {
    name: 'Gouped by metric',
    chartFunctionNames: ['generateBoxPlotChartPerMetric', 'generateLinePlotChartPerMetric'],
  },
  'grouped-by-site': {
    name: 'Gouped by site',
    chartFunctionNames: ['generateBloxPlotPerSite'],
  },
  'runs-by-site': {
    name: 'Runs by site',
    chartFunctionNames: ['generateGroupedBarChart'],
  },
};

const DEFAULT_SLUG = 'grouped-by-metric';

function createNavLink(name, slug, currentSlug) {
  const nav = document.querySelector('#nav');
  const link = document.createElement('a');
  if (slug !== currentSlug) {
    link.href = `./index.html?chart=${slug}`;
  }
  link.appendChild(document.createTextNode(name));
  nav.appendChild(link);
}

(function main () {
  const queryParams = new URLSearchParams(window.location.search);
  const chartSlug = queryParams.get('chart') || 'grouped-by-metric';

  for (let key in CHART_TYPES) {
    createNavLink(CHART_TYPES[key].name, key, chartSlug);
  }

  for (const functionName of CHART_TYPES[chartSlug].chartFunctionNames) {
    window[functionName]();
  }
})();
