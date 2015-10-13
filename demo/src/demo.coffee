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

  childSum = 0
  for child in rawData.a
    subTree = convert(child)
    if subTree
      node.children.push(subTree)
      childSum += subTree.value

  if childSum < node.value
    fillerNode =
      name: ''
      value: node.value - childSum
      filler: true
    node.children.push(fillerNode)

  node

# augments each node in the tree with the maximum distance
# it is from a terminal node
maxDepth = (node) ->
  return 0 if not node
  return 1 if not node.children
  return node.maxDepth if node.maxDepth

  max = 0
  node.children.forEach (child) ->
    depth = maxDepth(child)
    max = depth if depth > max

  node.maxDepth = max + 1
  return node.maxDepth

d3.json "data/profile.json", (err, data) ->

  profile = convert(data.profile)
  maxDepth(profile)

  flameGraph = d3.flameGraph()
    .size([1200, 600])
    .cellHeight(20)
    .data(profile)
    .breadcrumbs('.breadcrumb')
    .tooltip(true)
    .render('#d3-flame-graph')

  debugger

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
      flameGraph.zoom(node).render('#d3-flame-graph')