<h4>What is this?</h4>
<p>This is a d3.js plugin that renders flame graphs from hierarchical data.</p>

<h4>Currently implemented features:</h4>
<ul>
  <li>Breadcrumbs - the navbar is populated with the names of the classes that were navigated into.</li>
  <li>Tooltip showing the FQDN of the hovered classes, total and percentual time spent.</li>
</ul>

<h4>Roadmap:</h4>
<ul>
  <li>Filtering from the UI (input with autocomplete)</li>
  <li>Parametrizing the DOM element in which breadcrumbs are rendered </li>
  <li>Zoom by increasing the scale of the SVG</li>
  <li>Code refactoring</li>
</ul>

<h4>How was this made?</h4>
<p>This plugin was built using gulp and coffeescript. The build code needs serious refactoring as the demo page needs to be separated from the plugin distributable build.</p>