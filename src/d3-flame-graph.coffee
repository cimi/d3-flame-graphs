d3 = if @d3 then @d3 else require('d3')
throw new Error("d3.js needs to be loaded") if not d3

d3.flameGraphUtils =
  # augments each node in the tree with the maximum distance
  # it is from a terminal node, the list of parents linking
  # it to the root and filler nodes that balance the representation
  augment: (node, location) ->
    children = node.children
    # d3.partition adds the reverse (depth), here we store the distance
    # between a node and its furthest leaf
    return node if node.augmented
    node.originalValue = node.value
    node.level = if node.children then 1 else 0
    node.hidden = []
    node.location = location
    if not children?.length
      node.augmented = true
      return node

    childSum = children.reduce ((sum, child) -> sum + child.value), 0
    if childSum < node.value
      children.push({ value: node.value - childSum, filler: true })

    children.forEach((child, idx) ->
      d3.flameGraphUtils.augment(child, location + "." + idx))
    node.level += children.reduce ((max, child) -> Math.max(child.level, max)), 0
    node.augmented = true
    node

  partition: (data) ->
    d3.layout.partition()
      .sort (a,b) ->
        return  1 if a.filler # move fillers to the right
        return -1 if b.filler # move fillers to the right
        a.name.localeCompare(b.name)
      .nodes(data)

  hide: (nodes, unhide = false) ->
    sum = (arr) -> arr.reduce ((acc, val) -> acc + val), 0
    remove = (arr, val) ->
      # we need to remove precisely one occurrence of initial value
      pos = arr.indexOf(val)
      arr.splice(pos, 1) if pos >= 0
    process = (node, val) ->
      if unhide
        remove(node.hidden, val)
      else
        node.hidden.push(val)
      node.value = Math.max(node.originalValue - sum(node.hidden), 0)
    processChildren = (node, val) ->
      return if not node.children
      node.children.forEach (child) ->
        process(child, val)
        processChildren(child, val)
    processParents = (node, val) ->
      while node.parent
        process(node.parent, val)
        node = node.parent

    nodes.forEach (node) ->
      val = node.originalValue
      processParents(node, val)
      process(node, val)
      processChildren(node, val)

d3.flameGraph = (selector, root, debug = false) ->

  getClassAndMethodName = (fqdn) ->
    return "" if not fqdn
    tokens = fqdn.split(".")
    tokens.slice(tokens.length - 2).join(".")

  # Return a vector (0.0 -> 1.0) that is a hash of the input string.
  # The hash is computed to favor early characters over later ones, so
  # that strings with similar starts have similar vectors. Only the first
  # 6 characters are considered.
  hash = (name) ->
    [result, maxHash, weight, mod] = [0, 0, 1, 10]
    name = getClassAndMethodName(name).slice(0, 6)
    for i in [0..(name.length-1)]
      result += weight * (name.charCodeAt(i) % mod)
      maxHash += weight * (mod - 1)
      weight *= 0.7
    if maxHash > 0 then result / maxHash else result

  class FlameGraph
    constructor: (selector, root) ->
      @_selector = selector
      @_generateAccessors([
        'margin',
        'cellHeight',
        'zoomEnabled',
        'zoomAction',
        'tooltip',
        'tooltipPlugin',
        'color'])
      @_ancestors = []

      # enable logging only if explicitly specified
      if debug
        @console = window.console
      else
        @console =
          log: ->
          time: ->
          timeEnd: ->

      # defaults
      @_size        = [1200, 800]
      @_cellHeight  = 20
      @_margin      = { top: 0, right: 0, bottom: 0, left: 0 }
      @_color       = (d) ->
        val = hash(d.name)
        r = 200 + Math.round(55 * val)
        g = 0 + Math.round(230 * (1 - val))
        b = 0 + Math.round(55 * (1 - val))
        "rgb(#{r}, #{g}, #{b})"
      @_tooltipEnabled = true
      @_zoomEnabled = true
      @_tooltipPlugin = d3.tip() if @_tooltipEnabled and d3.tip

      # initial processing of data
      @console.time('augment')
      @original = d3.flameGraphUtils.augment(root, [0])
      @console.timeEnd('augment')
      @root(@original)

    size: (size) ->
      return @_size if not size
      @_size = size
      d3.select(@_selector).select('.flame-graph')
        .attr('width', @_size[0])
        .attr('height', @_size[1])
      @

    root: (root) ->
      return @_root if not root
      @console.time('partition')
      @_root = root
      @_data = d3.flameGraphUtils.partition(@_root)
      @console.timeEnd('partition')
      @

    hide: (predicate, unhide = false) ->
      matches = @select(predicate, false)
      return if not matches.length
      d3.flameGraphUtils.hide(matches, unhide)
      # re-partition the data prior to rendering
      @_data = d3.flameGraphUtils.partition(@_root)
      @render()

    zoom: (node, event) ->
      throw new Error("Zoom is disabled!") if not @zoomEnabled()
      @tip.hide() if @tip
      if node in @_ancestors
        @_ancestors = @_ancestors.slice(0, @_ancestors.indexOf(node))
      else
        @_ancestors.push(@_root)
      @root(node).render()
      @_zoomAction?(node, event)
      @

    width: () -> @size()[0] - (@margin().left + @margin().right)

    height: () -> @size()[1] - (@margin().top + @margin().bottom)

    label: (d) ->
      return "" if not d?.name
      label = getClassAndMethodName(d.name)
      label.substr(0, Math.round(@x(d.dx) / (@cellHeight() / 10 * 4)))

    select: (predicate, onlyVisible = true) ->
      if onlyVisible
        return @container.selectAll('.node').filter(predicate)
      else
        # re-partition original and filter that
        result = d3.flameGraphUtils.partition(@original).filter(predicate)
        return result

    render: () ->
      throw new Error("No DOM element provided") if not @_selector
      @console.time('render')

      @_createContainer() if not @container

      # reset size and scales
      @fontSize = (@cellHeight() / 10) * 0.4

      @x = d3.scale.linear()
        .domain([0, d3.max(@_data, (d) -> d.x + d.dx)])
        .range([0, @width()])

      visibleCells = Math.floor(@height() / @cellHeight())
      maxLevels = @_root.level
      @y = d3.scale.quantize()
        .domain([d3.max(@_data, (d) -> d.y), 0])
        .range(d3.range(maxLevels)
          .map((cell) =>  ((cell + visibleCells) - (@_ancestors.length + maxLevels)) * @cellHeight()))

      # JOIN
      data = @_data.filter((d) => @x(d.dx) > 0.4 and @y(d.y) >= 0 and not d.filler)
      renderNode =
        x: (d) => @x(d.x)
        y: (d) => @y(d.y)
        width: (d) => @x(d.dx)
        height: (d) => @cellHeight()
        text: (d) => @label(d) if d.name and @x(d.dx) > 40
      existingContainers = @container
        .selectAll('.node')
        .data(data, (d) -> d.location)
        .attr('class', 'node')

      # UPDATE
      @_renderNodes existingContainers, renderNode

      # ENTER
      newContainers = existingContainers.enter()
          .append('g')
            .attr('class', 'node')
      @_renderNodes newContainers, renderNode, true

      # EXIT
      existingContainers.exit().remove()

      @_renderAncestors()._enableNavigation()   if @zoomEnabled()
      @_renderTooltip()                         if @tooltip()

      @console.timeEnd('render')
      @console.log("Processed #{@_data.length} items")
      @console.log("Rendered #{@container.selectAll('.node')[0]?.length} elements")
      @

    _createContainer: () ->
      # remove any previously existing svg
      d3.select(@_selector).select('svg').remove()
      # create main svg container
      svg = d3.select(@_selector)
        .append('svg')
          .attr('class', 'flame-graph')
          .attr('width', @_size[0])
          .attr('height', @_size[1])
      # we set an offset based on the margin
      offset = "translate(#{@margin().left}, #{@margin().top})"
      # @container will hold all our nodes
      @container = svg.append('g')
          .attr('transform', offset)

      # this rectangle draws the border around the flame graph
      # has to be appended after the container so that the border is visible
      # we also need to apply the same translation
      svg.append('rect')
        .attr('width', @_size[0] - (@_margin.left + @_margin.right))
        .attr('height', @_size[1] - (@_margin.top + @_margin.bottom))
        .attr('transform', offset)
        .attr('class', 'border-rect')

    _renderNodes: (containers, attrs, enter = false) ->
      targetRects = containers.selectAll('rect') if not enter
      targetRects = containers.append('rect') if enter
      targetRects
        .attr('fill', (d) => @_color(d))
        .transition()
          .attr('width', attrs.width)
          .attr('height', @cellHeight())
          .attr('x', attrs.x)
          .attr('y', attrs.y)

      targetLabels = containers.selectAll('text') if not enter
      targetLabels = containers.append('text') if enter
      containers.selectAll('text')
        .attr('class', 'label')
        .style('font-size', "#{@fontSize}em")
        .transition()
          .attr('dy', "#{@fontSize / 2}em")
          .attr('x', (d) => attrs.x(d) + 2)
          .attr('y', (d, idx) => attrs.y(d, idx) + @cellHeight() / 2)
        .text(attrs.text)
      @

    _renderTooltip: () ->
      return @ if not @_tooltipPlugin or not @_tooltipEnabled
      @tip = @_tooltipPlugin
        .attr('class', 'd3-tip')
        .html(@tooltip())
        .direction (d) =>
          return 'w' if @x(d.x) + @x(d.dx) / 2 > @width() - 100
          return 'e' if @x(d.x) + @x(d.dx) / 2 < 100
          return 's' # otherwise
        .offset (d) =>
          x = @x(d.x) + @x(d.dx) / 2
          xOffset = Math.max(Math.ceil(@x(d.dx) / 2), 5)
          yOffset = Math.ceil(@cellHeight() / 2)
          return [0, -xOffset] if @width() - 100 < x
          return [0,  xOffset] if x < 100
          return [ yOffset, 0]

      @container.call(@tip)
      @container
        .selectAll('.node')
          .on 'mouseover', (d) => @tip.show(d, d3.event.currentTarget)
          .on 'mouseout', @tip.hide
        .selectAll('.label')
          .on 'mouseover', (d) => @tip.show(d, d3.event.currentTarget.parentNode)
          .on 'mouseout', @tip.hide
      @

    _renderAncestors: () ->
      if not @_ancestors.length
        ancestors = @container.selectAll('.ancestor').remove()
        return @

      # FIXME: this is pretty ugly, but we need to add links between ancestors
      ancestorData = @_ancestors.map((ancestor, idx) ->
        { name: ancestor.name, value: idx + 1, location: ancestor.location })
      for ancestor, idx in ancestorData
        prev = ancestorData[idx - 1]
        prev.children = [ancestor] if prev

      renderAncestor =
        x: (d) => 0
        y: (d) => return @height() - (d.value * @cellHeight())
        width: @width()
        height: @cellHeight()
        text: (d) => "↩ #{getClassAndMethodName(d.name)}"

      # JOIN
      ancestors = @container
        .selectAll('.ancestor')
        .data(d3.layout.partition().nodes(ancestorData[0]), (d) -> d.location)
      # UPDATE
      @_renderNodes ancestors, renderAncestor

      # ENTER
      newAncestors = ancestors
        .enter()
        .append('g')
          .attr('class', 'ancestor')
      @_renderNodes newAncestors, renderAncestor, true

      # EXIT
      ancestors.exit().remove()
      @

    _enableNavigation: () ->
      clickable = (d) => Math.round(@width() - @x(d.dx)) > 0 and d.children?.length
      @container
        .selectAll('.node')
        .classed('clickable', (d) => clickable(d))
        .on 'click', (d) =>
          @tip.hide() if @tip
          @zoom(d, d3.event) if clickable(d)
      @container
        .selectAll('.ancestor')
        .on 'click', (d, idx) =>
          @tip.hide() if @tip
          @zoom(@_ancestors[idx], d3.event)
      @

    _generateAccessors: (accessors) ->
      for accessor in accessors
        @[accessor] = do (accessor) ->
          (newValue) ->
            return @["_#{accessor}"] if not arguments.length
            @["_#{accessor}"] = newValue
            return @

  return new FlameGraph(selector, root)