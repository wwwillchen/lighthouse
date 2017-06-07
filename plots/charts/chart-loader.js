function parseQueryParameters(queryParams) {
  var params = queryParams.substring(1).split('&');
  const queryParamsObject = {}
  for (var i = 0; i < params.length; ++i) {
    var pair = params[i].split('=');
    var name = pair.shift();
    queryParamsObject[name] = pair.join('=');
  }
  return queryParamsObject;
}

const queryParams = parseQueryParameters(window.location.search);
queryParams.chart = queryParams.chart || "./grouped-by-metric.js"

const chartScript = document.createElement("script");
chartScript.type = "text/javascript";
chartScript.src = queryParams.chart;
document.body.appendChild(chartScript);

function createNavLink(name, file) {
  const nav = document.querySelector('#nav');
  const link = document.createElement('a');
  if (file !== queryParams.chart) {
    link.href = `./index.html?results=${queryParams.results}&chart=${file}`;
  }
  link.appendChild(document.createTextNode(name));
  nav.appendChild(link);
}

createNavLink('Grouped by metric', './grouped-by-metric.js');
createNavLink('Metrics per site', './metrics-per-site.js');
createNavLink('Bars per site', './bars-per-site.js');
