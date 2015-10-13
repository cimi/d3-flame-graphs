# function that converts from a particular data format into the generic one
# expected by the plugin
convert = (rawData) ->
  value = 0
  for state in ['RUNNABLE', 'BLOCKED', 'TIMED_WAITING', 'WAITING']
    value += rawData.c[state] if not isNaN(rawData.c[state])

  timeElapsed = new Date()
  timeElapsed.setSeconds(value)
  timeFormat = countdown.DAYS | countdown.HOURS | countdown.MINUTES | countdown.SECONDS
  node =
    name: rawData.n,
    value: value,
    time: countdown(new Date(), timeElapsed, timeFormat)
    children: []

  # the a field is the list of children
  return node if not rawData.a
  for child in rawData.a
    subTree = convert(child)
    if subTree
      node.children.push(subTree)

  node

d3.json "data/profile.json", (err, data) ->

  flameGraph = d3.flameGraph()
    .size([1200, 600])
    .cellHeight(20)
    .data(convert(data.profile))
    .zoomEnabled(true)
    .tooltipEnabled(true)
    .render('#d3-flame-graph')

  d3.select('#highlight')
    .on 'click', () ->
      nodes = flameGraph.select(/java\.util.*/)
      nodes.classed("highlight", (d, i) -> not d3.select(this).classed("highlight"))

  d3.select('#zoom')
    .on 'click', () ->
      # check to see if the node is not already selected
      # this can be done more elegantly, this is quick & dirty
      root = d3.select('.flame-graph g g:first-child text').datum()
      return if root.name == 'java.util.concurrent.CountDownLatch.await'

      # pick the first java.util.concurrent method, we know it's the one above
      node = flameGraph.select(/java\.util\.concurrent.*/, false)[0]
      flameGraph.zoom(node)