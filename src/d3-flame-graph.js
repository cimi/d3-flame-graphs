import { select, event } from 'd3-selection';
import { scaleLinear, scaleQuantize } from 'd3-scale';
import { min, max, range } from 'd3-array';
import { transition } from 'd3-transition';
import d3Tip from 'd3-tip';
import { partition, hierarchy } from 'd3-hierarchy';

let indexOf = [].indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; }
    return -1;
  };

let getClassAndMethodName = function(fqdn) {
  let tokens;
  if (!fqdn) {
    return "";
  }
  tokens = fqdn.split(".");
  return tokens.slice(tokens.length - 2).join(".");
};

// Return a vector (0.0 -> 1.0) that is a hash of the input string.
// The hash is computed to favor early characters over later ones, so
// that strings with similar starts have similar vectors. Only the first
// 6 characters are considered.
let hash = function(name) {
  let i, j, maxHash, mod, ref, ref1, result, weight;
  ref = [0, 0, 1, 10], result = ref[0], maxHash = ref[1], weight = ref[2], mod = ref[3];
  name = getClassAndMethodName(name).slice(0, 6);
  for (i = j = 0, ref1 = name.length - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; i = 0 <= ref1 ? ++j : --j) {
    result += weight * (name.charCodeAt(i) % mod);
    maxHash += weight * (mod - 1);
    weight *= 0.7;
  }
  if (maxHash > 0) {
    return result / maxHash;
  } else {
    return result;
  }
};

const FlameGraphUtils = {
  // augments each node in the tree with the maximum distance
  // it is from a terminal node, the list of parents linking
  // it to the root and filler nodes that balance the representation
  augment(node, location) {
    let children = node.children;
    // d3.partition adds the reverse (depth), here we store the distance
    // between a node and its furthest leaf
    if (node.augmented) {
      return node;
    }
    node.originalValue = node.value;
    node.level = node.children ? 1 : 0;
    node.hidden = [];
    node.location = location;
    if (!(children != null ? children.length : void 0)) {
      node.augmented = true;
      return node;
    }
    let childSum = children.reduce((function(sum, child) {
      return sum + child.value;
    }), 0);
    if (childSum < node.value) {
      children.push({
        value: node.value - childSum,
        filler: true
      });
    }
    children.forEach((child, idx) => FlameGraphUtils.augment(child, location + "." + idx));
    node.level += children.reduce(((max, child) => Math.max(child.level, max)), 0);
    node.augmented = true;
    return node;
  },
  partition(data) {
    let d3partition = partition();

    let root = hierarchy(data)
      .sum(d => d.data ? d.data.value : d.value)
      .sort((a, b) => {
        if (a.filler || a.data.filler) {
          return 1;  // move fillers to the right
        }
        if (b.filler || b.data.filler) {
          return -1; // move fillers to the right
        }
        return a.data.name.localeCompare(b.data.name);
      });
    return d3partition(root).descendants();
  },
  hide(nodes, unhide) {
    if (unhide === null) {
      unhide = false;
    }
    let sum = arr => arr.reduce(((acc, val) => acc + val), 0);
    let remove = (arr, val) => {
      // we need to remove precisely one occurrence of initial value
      let pos = arr.indexOf(val);
      if (pos >= 0) {
        return arr.splice(pos, 1);
      }
    };
    let process = (node, val) => {
      if (unhide) {
        remove(node.hidden, val);
      } else {
        node.hidden.push(val);
      }
      return node.value = Math.max(node.originalValue - sum(node.hidden), 0);
    };
    let processChildren = (node, val) => {
      if (!node.children) {
        return;
      }
      return node.children.forEach(child => {
        process(child, val);
        return processChildren(child, val);
      });
    };
    let processParents = (node, val) => {
      let results = [];
      while (node.parent) {
        process(node.parent, val);
        results.push(node = node.parent);
      }
      return results;
    };
    return nodes.forEach(node => {
      let val = node.originalValue;
      processParents(node, val);
      process(node, val);
      return processChildren(node, val);
    });
  }
};
class FlameGraph {
  constructor(selector, root, debug) {
    this._selector = selector;
    this._generateAccessors(['margin', 'cellHeight', 'zoomEnabled', 'zoomAction', 'tooltip', 'tooltipPlugin', 'color', 'labelFunction']);
    this._ancestors = [];
    if (debug == null) {
      debug = false;
    }

    // enable logging only if explicitly specified
    if (debug) {
      this.console = window.console;
    } else {
      this.console = {
        log() {},
        time() {},
        timeEnd() {}
      };
    }

    // defaults
    this._size = [1200, 800];
    this._cellHeight = 20;
    this._margin = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };
    this._color = d => {
      let val = hash(d.data ? d.data.name : d.name);
      let r = 200 + Math.round(55 * val);
      let g = 0 + Math.round(230 * (1 - val));
      let b = 0 + Math.round(55 * (1 - val));
      return "rgb(" + r + ", " + g + ", " + b + ")";
    };
    this._labelFunction = null;
    this._tooltipEnabled = true;
    this._zoomEnabled = true;
    if (this._tooltipEnabled && d3Tip) {
      this._tooltipPlugin = d3Tip();
    }

    // initial processing of data
    this.console.time('augment');
    this.original = FlameGraphUtils.augment(root, '0');
    this.console.timeEnd('augment');
    this.root(this.original);
  }

  size(size) {
    if (size) {
      this._size = size;
      select(this._selector).select('.flame-graph').attr('width', this._size[0]).attr('height', this._size[1]);
      return this;
    }
    return this._size;
  }

  root(root) {
    if (!root) {
      return this._root;
    }
    this.console.time('partition');
    this._root = root;
    this._data = FlameGraphUtils.partition(this._root);
    this._rootNode = this._data[0];
    this.console.timeEnd('partition');
    return this;
  }

  hide(predicate, unhide) {
    let matches;
    if (unhide == null) {
      unhide = false;
    }
    matches = this.select(predicate, false);
    if (!matches.length) {
      return;
    }
    FlameGraphUtils.hide(matches, unhide);
    this._data = FlameGraphUtils.partition(this._root);
    return this.render();
  }

  zoom(node, event) {
    if (!this.zoomEnabled()) {
      throw new Error("Zoom is disabled!");
    }
    if (this.tip) {
      this.tip.hide();
    }
    if (indexOf.call(this._ancestors, node) >= 0) {
      this._ancestors = this._ancestors.slice(0, this._ancestors.indexOf(node));
    } else {
      this._ancestors.push(this._root);
    }
    this.root(node.data ? node.data : node).render();
    if (typeof this._zoomAction === "function") {
      this._zoomAction(node, event);
    }
    return this;
  }

  width() {
    return this.size()[0] - (this.margin().left + this.margin().right);
  }

  height() {
    return this.size()[1] - (this.margin().top + this.margin().bottom);
  }

  label(d) {
    if (!(d != null ? d.data.name : void 0)) {
      return "";
    }
    let label = typeof this._labelFunction === "function" ? this._labelFunction(d) : getClassAndMethodName(d.data.name);

    return label.substr(0, Math.round(this.x(d.x1 - d.x0) / (this.cellHeight() / 10 * 4)));
  }

  select(predicate, onlyVisible) {
    let result;
    if (onlyVisible == null) {
      onlyVisible = true;
    }
    if (onlyVisible) {
      return this.container.selectAll('.node').filter(predicate);
    } else {
      // re-partition the data prior to rendering
      result = FlameGraphUtils.partition(this.original).filter(predicate);
      return result;
    }
  }

  render() {
    if (!this._selector) {
      throw new Error("No DOM element provided");
    }
    this.console.time('render');
    if (!this.container) {
      this._createContainer();
    }

    // reset size and scales
    this.fontSize = (this.cellHeight() / 10) * 0.4;

    this.x = scaleLinear().domain([0, max(this._data, d => d.x1)]).range([0, this.width()]);

    let visibleCells = Math.floor(this.height() / this.cellHeight());
    let maxLevels = this._root.level;

    this.y = scaleQuantize().domain([min(this._data, d => d.y0), max(this._data, d => d.y0)]).range(range(maxLevels).map((function(_this) {
      return function(cell) {
        return (visibleCells - 1 - cell - _this._ancestors.length) * _this.cellHeight();
      };
    })(this)));

    // JOIN
    let data = this._data.filter((function(_this) {
      return function(d) {
        return _this.x(d.x1 - d.x0) > 0.4 && _this.y(d.y0) >= 0 && !d.data.filler;
      };
    })(this));
    let renderNode = {
      x: (function(_this) {
        return function(d) {
          return _this.x(d.x0);
        };
      })(this),
      y: (function(_this) {
        return function(d) {
          return _this.y(d.y0);
        };
      })(this),
      width: (function(_this) {
        return function(d) {
          let res = _this.x(d.x1 - d.x0);
          return res;
        };
      })(this),
      height: (function(_this) {
        return function(d) {
          return _this.cellHeight();
        };
      })(this),
      text: (function(_this) {
        return function(d) {
          if (d.data.name && _this.x(d.x1 - d.x0) > 40) {
            return _this.label(d);
          }
        };
      })(this)
    };
    let existingContainers = this.container.selectAll('.node').data(data, d => d.data.location).attr('class', 'node');

    // UPDATE
    this._renderNodes(existingContainers, renderNode, false, data);

    // ENTER
    let newContainers = existingContainers.enter().append('g').attr('class', 'node');
    this._renderNodes(newContainers, renderNode, true, data);

    // EXIT
    existingContainers.exit().remove();
    if (this.zoomEnabled()) {
      this._renderAncestors()._enableNavigation();
    }
    if (this.tooltip()) {
      this._renderTooltip();
    }
    this.console.timeEnd('render');
    this.console.log(`Processed ${this._data.length} items`);
    return this;
  }

  _createContainer() {
    // remove any previously existing svg
    select(this._selector).select('svg').remove();
    // create main svg container
    let svg = select(this._selector).append('svg').attr('class', 'flame-graph').attr('width', this._size[0]).attr('height', this._size[1]);
    // we set an offset based on the margin
    let offset = `translate(${this.margin().left}, ${this.margin().top})`;
    // this.container will hold all our nodes
    this.container = svg.append('g').attr('transform', offset);

    // this rectangle draws the border around the flame graph
    // has to be appended after the container so that the border is visible
    // we also need to apply the same translation
    return svg.append('rect')
      .attr('width', this._size[0] - (this._margin.left + this._margin.right))
      .attr('height', this._size[1] - (this._margin.top + this._margin.bottom))
      .attr('transform', offset)
      .attr('class', 'border-rect');
  }

  _renderNodes(containers, attrs, enter, data) {
    let targetLabels;
    let targetRects;
    if (enter == null) {
      enter = false;
    }
    if (!enter) {
      targetRects = containers.selectAll('rect');
    }
    if (enter) {
      targetRects = containers.append('rect');
    }

    targetRects.data(data, d => d.data ? d.data.location : d.location).attr('fill', (function(_this) {
      return function(d) {
        return _this._color(d);
      };
    })(this)).transition().attr('width', attrs.width).attr('height', this.cellHeight()).attr('x', attrs.x).attr('y', attrs.y);

    if (!enter) {
      targetLabels = containers.selectAll('text');
    }
    if (enter) {
      targetLabels = containers.append('text');
    }
    targetLabels.data(data, d => d.data ? d.data.location : d.location)
      .attr('class', 'label')
      .style('font-size', this.fontSize + "em")
      .transition().attr('dy', (this.fontSize / 2) + "em").attr('x', (function(_this) {
      return function(d) {
        return attrs.x(d) + 2;
      };
    })(this)).attr('y', (function(_this) {
      return function(d, idx) {
        return attrs.y(d, idx) + _this.cellHeight() / 2;
      };
    })(this)).text(attrs.text);
    return this;
  }

  _renderTooltip() {
    if (!this._tooltipPlugin || !this._tooltipEnabled) {
      return this;
    }
    this.tip = this._tooltipPlugin.attr('class', 'd3-tip').html(this.tooltip()).direction(((_this => d => {
      if (_this.x(d.x0) + _this.x(d.x1 - d.x0) / 2 > _this.width() - 100) {
        return 'w';
      }
      if (_this.x(d.x0) + _this.x(d.x1 - d.x0) / 2 < 100) {
        return 'e';
      }
      return 's';
    }))(this)).offset(((_this => d => {
      let x = _this.x(d.x0) + _this.x(d.x1 - d.x0) / 2;
      let xOffset = Math.max(Math.ceil(_this.x(d.x1 - d.x0) / 2), 5);
      let yOffset = Math.ceil(_this.cellHeight() / 2);
      if (_this.width() - 100 < x) {
        return [0, -xOffset];
      }
      if (x < 100) {
        return [0, xOffset];
      }
      return [yOffset, 0];
    }))(this));
    this.container.call(this.tip);
    this.container.selectAll('.node').on('mouseover', (function(_this) {
      return function(d) {
        return _this.tip.show(d, event.currentTarget);
      };
    })(this)).on('mouseout', this.tip.hide).selectAll('.label').on('mouseover', (function(_this) {
      return function(d) {
        return _this.tip.show(d, event.currentTarget.parentNode);
      };
    })(this)).on('mouseout', this.tip.hide);
    return this;
  }

  _renderAncestors() {
    let i;
    let j;
    let idx;
    let len;
    let ancestor;
    let ancestors;
    if (!this._ancestors.length) {
      ancestors = this.container.selectAll('.ancestor').remove();
      return this;
    }
    let ancestorData = this._ancestors.map((ancestor, idx) => ({
      name: ancestor.name,
      value: idx + 1,
      location: ancestor.location,
      isAncestor: true
    }));
    for (idx = j = 0, len = ancestorData.length; j < len; idx = ++j) {
      ancestor = ancestorData[idx];
      let prev = ancestorData[idx - 1];
      if (prev) {
        prev.children = [ancestor];
      }
    }

    // FIXME: this is pretty ugly, but we need to add links between ancestors
    let renderAncestor = {
      x: (function(_this) {
        return function(d) {
          return 0;
        };
      })(this),
      y: (function(_this) {
        return function(d) {
          return _this.height() - (d.value * _this.cellHeight());
        };
      })(this),
      width: this.width(),
      height: this.cellHeight(),
      text: (function(_this) {
        return function(d) {
          return "↩ " + (getClassAndMethodName(d.data ? d.data.name : d.name));
        };
      })(this)
    };

    // JOIN
    ancestors = this.container.selectAll('.ancestor').data(
      FlameGraphUtils.partition(ancestorData[0]), d => d.location
    );

    // UPDATE
    this._renderNodes(ancestors, renderAncestor, false, ancestorData);
    // ENTER
    let newAncestors = ancestors.enter().append('g').attr('class', 'ancestor');
    this._renderNodes(newAncestors, renderAncestor, true, ancestorData);
    // EXIT
    ancestors.exit().remove();
    return this;
  }

  _enableNavigation() {
    let clickable = ((_this => d => {
      let ref;
      return Math.round(_this.width() - _this.x(d.x1 - d.x0)) > 0 && ((ref = d.children) != null ? ref.length : void 0);
    }))(this);

    this.container.selectAll('.node').classed('clickable', ((_this => d => clickable(d)))(this)).on('click', ((_this => d => {
      if (_this.tip) {
        _this.tip.hide();
      }
      if (clickable(d)) {
        return _this.zoom(d, event);
      }
    }))(this));
    this.container.selectAll('.ancestor').on('click', ((_this => (d, idx) => {
      if (_this.tip) {
        _this.tip.hide();
      }
      return _this.zoom(_this._ancestors[idx], event);
    }))(this));
    return this;
  }

  _generateAccessors(accessors) {
    let accessor;
    let results = [];
    for (let j = 0, len = accessors.length; j < len; j++) {
      accessor = accessors[j];
      results.push(this[accessor] = ((accessor => function(newValue) {
        if (!arguments.length) {
          return this["_" + accessor];
        }
        this["_" + accessor] = newValue;
        return this;
      }))(accessor));
    }
    return results;
  }
}

export default FlameGraph;
