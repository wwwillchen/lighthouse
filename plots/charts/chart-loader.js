/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env browser */

function parseQueryParameters(queryParams) {
  const params = queryParams.substring(1).split('&');
  const queryParamsObject = {};
  for (let i = 0; i < params.length; ++i) {
    const pair = params[i].split('=');
    const name = pair.shift();
    queryParamsObject[name] = pair.join('=');
  }
  return queryParamsObject;
}

const queryParams = parseQueryParameters(window.location.search);
queryParams.chart = queryParams.chart || './grouped-by-metric.js';

const chartScript = document.createElement('script');
chartScript.type = 'text/javascript';
chartScript.src = queryParams.chart;
document.body.appendChild(chartScript);

function createNavLink(name, file) {
  const nav = document.querySelector('#nav');
  const link = document.createElement('a');
  if (file !== queryParams.chart) {
    link.href = `./index.html?chart=${file}`;
  }
  link.appendChild(document.createTextNode(name));
  nav.appendChild(link);
}

createNavLink('Grouped by metric', './grouped-by-metric.js');
createNavLink('Metrics per site', './metrics-per-site.js');
createNavLink('Bars per site', './bars-per-site.js');
