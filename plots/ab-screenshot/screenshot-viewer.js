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

/* global aggregatedScreenshots */
/* eslint-env browser */

const queuedRendering = [];
const imagePopoverElement = document.getElementById('image-popover');
const rootElement = document.getElementById('container');
let isAlignTimelineEnabled = true;

/**
 * Incrementally renders the sites, otherwise it hangs the browser
 * because it's rendering so many screenshots.
 * @param {!Function} fn
 */
function enqueueRendering(fn) {
  const isFirst = queuedRendering.length === 0;
  queuedRendering.push(fn);
  if (isFirst) {
    renderFromQueue();
  }
}

function renderFromQueue() {
  window.requestAnimationFrame(_ => {
    const renderFn = queuedRendering.shift();
    if (renderFn) {
      renderFn();
      renderFromQueue();
    }
  });
}

/**
 * Renders the A/B screenshot comparison content generated from analyze.js.
 */
function main() {
  renderLegend(aggregatedScreenshots.a, aggregatedScreenshots.b);
  renderScreenshots(aggregatedScreenshots.data);
  document.getElementById('align-control').addEventListener('click', onToggleAlign);
}

main();

/**
 * Toggling the align timelines checkbox throws away previously rendered
 * timelines and renders new timelines based on the new setting value.
 */
function onToggleAlign() {
  isAlignTimelineEnabled = !isAlignTimelineEnabled;
  removeChildren(rootElement);
  renderScreenshots(aggregatedScreenshots.data);
}

/**
 * Queues the rendering of the timelines for each site
 * so the page loading is less painful.
 * @param {!SiteScreenshotsComparison} comparisons
 */
function renderScreenshots(comparisons) {
  comparisons.forEach(comparison =>
    enqueueRendering(() => {
      rootElement.appendChild(createSiteElement(comparison));
    }));
}

/**
 * Renders the legend in the top bar based on the name of the path.
 * @param {string} a
 * @param {string} b
 */
function renderLegend(a, b) {
  document.getElementById('legend-a').appendChild(createText(a));
  document.getElementById('legend-b').appendChild(createText(b));
}

/**
 * Creates an A/B timeline comparison for a site.
 * @param {!SiteScreenshotsComparison} comparison
 * @return {!Element}
 */
function createSiteElement(comparison) {
  const siteElement = createElement('div', 'site-container');
  const siteNameElement = createElement('div', 'site-name');
  siteNameElement.appendChild(createText(comparison.siteName));
  siteElement.appendChild(siteNameElement);

  const runTimelineElement = createElement('div');
  runTimelineElement.appendChild(createRunTimeline(comparison.runA.screenshots));
  runTimelineElement.appendChild(createRunTimeline(comparison.runB.screenshots));

  if (isAlignTimelineEnabled) {
    const maxMsTimestamp = comparison.runA.screenshots
      .concat(comparison.runB.screenshots)
      .reduce((acc, screenshot) => Math.max(acc, screenshot.timing), 0);
    runTimelineElement.appendChild(createTimelineXAxis(maxMsTimestamp));
  } else {
    runTimelineElement.style['overflow-x'] = 'scroll';
  }

  siteElement.appendChild(runTimelineElement);
  return siteElement;
}

/**
 * Creates a timeline of screenshots for a single run.
 * @param {!Array<!Screenshot>} screenshots
 * @return {!Element}
 */
function createRunTimeline(screenshots) {
  const runElement = createElement('div', 'run-container');

  if (isAlignTimelineEnabled) {
    runElement.appendChild(createAlignedTimeline(screenshots));
  } else {
    runElement.appendChild(createNonOverlappingTimeline(screenshots));
  }

  return runElement;
}

/**
 * Creates a marker every 0.5 seconds on the x axis.
 * @param {number} maxMsTimestamp
 * @return {!Element}
 */
function createTimelineXAxis(maxMsTimestamp) {
  const xAxisElement = createElement('div', 'x-axis-container');
  const maxSeconds = Math.ceil(maxMsTimestamp) / 1000;
  for (let i = 0; i <= maxSeconds; i += 0.5) {
    const markerElement = createElement('div', 'x-axis-marker');
    markerElement.style.left = i * 1000 / 5 + 'px';
    markerElement.style.top = '-20px';
    markerElement.appendChild(createText(i + 's'));
    xAxisElement.appendChild(markerElement);
  }
  return xAxisElement;
}

/**
 * Creates a timeline of screenshots that are aligned on the x axis.
 * Useful for comparing across runs and sites.
 * @param {!Array<!Screenshot>} screenshots
 * @return {!Element}
 */
function createAlignedTimeline(screenshots) {
  const timelineElement = createElement('div', 'timeline-container');
  timelineElement.style.height = '115px';

  let previousShownScreenshotTiming = 0;
  screenshots.forEach(screenshot => {
    const screenshotElement = createElement('div', 'screenshot-container');
    screenshotElement.style.position = 'absolute';
    screenshotElement.style.left = screenshot.timing / 5 + 'px';

    const headerElement = createElement('div', 'screenshot-header');
    const headerLabelElement = createHeaderLabelElement(screenshot);

    if (!headerLabelElement.childNodes.length) {
      if (screenshot.timing - previousShownScreenshotTiming < 100) {
        return;
      }
    }
    previousShownScreenshotTiming = screenshot.timing;

    if (headerLabelElement.childNodes.length) {
      screenshotElement.style.top = '-17px';
    }

    headerElement.appendChild(headerLabelElement);
    screenshotElement.appendChild(headerElement);
    screenshotElement.appendChild(createScreenshotImageElement(screenshot));
    timelineElement.appendChild(screenshotElement);
  });
  return timelineElement;
}

/**
 * Creates a timeline of screenshots that are not aligned.
 * Useful for viewing every screenshot.
 * @param {!Array<!Screenshot>} screenshots
 * @return {!Element}
 */
function createNonOverlappingTimeline(screenshots) {
  const timelineElement = createElement('div', 'timeline-container');
  screenshots.forEach(screenshot => {
    const screenshotElement = createElement('div', 'screenshot-container');
    const headerElement = createElement('div', 'screenshot-header');
    headerElement.appendChild(createHeaderLabelElement(screenshot));
    headerElement.appendChild(createText(screenshot.timing));
    screenshotElement.appendChild(headerElement);
    screenshotElement.appendChild(createScreenshotImageElement(screenshot));
    timelineElement.appendChild(screenshotElement);
  });
  return timelineElement;
}

/**
 * @param {!Screenshot} screenshot
 * @return {!Element}
 */
function createHeaderLabelElement(screenshot) {
  const headerLabelElement = createElement('div', 'screenshot-header-label');

  // Leave a space after each text label because a single screenshot may have
  // multiple labels on it
  if (screenshot.isFCP) {
    headerLabelElement.classList.add('is-fcp');
    headerLabelElement.appendChild(createText('fcp '));
  }
  if (screenshot.isFMP) {
    headerLabelElement.classList.add('is-fmp');
    headerLabelElement.appendChild(createText('fmp '));
  }
  if (screenshot.isVC100) {
    headerLabelElement.classList.add('is-vc100');
    headerLabelElement.appendChild(createText('vc100 '));
  }
  return headerLabelElement;
}

/**
 * @param {!Screenshot} screenshot
 * @return {!Element}
 */
function createScreenshotImageElement(screenshot) {
  const image = createElement('img', 'screenshot-image');
  image.src = screenshot.datauri;
  image.addEventListener(
    'mouseover',
    onImageMouseover.bind(null, imagePopoverElement, screenshot)
  );
  image.addEventListener('mouseout', () => { removeChildren(imagePopoverElement); });
  return image;
}

/**
 * Show a zoomed in image of the screenshot as a popover.
 * @param {!Element} imagePopoverElement
 * @param {!Screenshot} screenshot
 * @param {!Event} event
 */
function onImageMouseover(imagePopoverElement, screenshot, event) {
  const image = createElement('img');
  image.src = screenshot.datauri;
  imagePopoverElement.appendChild(image);
  imagePopoverElement.style.top = event.clientY + 20 + 'px';
  imagePopoverElement.style.left = event.clientX + 20 + 'px';
}

/**
 * @param {string} tag
 * @param {string} className
 */
function createElement(tag, className) {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}

/**
 * @param {string} text
 */
function createText(text) {
  return document.createTextNode(text);
}

/**
 * @param {!Element} parent
 */
function removeChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}
