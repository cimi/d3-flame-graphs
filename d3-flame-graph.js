(function() {
  var d3,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  d3 = this.d3 ? this.d3 : require('d3');

  if (!d3) {
    throw new Error("d3.js needs to be loaded");
  }

  d3.flameGraphUtils = {
    augment: function(node, location) {
      var childSum, children;
      children = node.children;
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
      childSum = children.reduce((function(sum, child) {
        return sum + child.value;
      }), 0);
      if (childSum < node.value) {
        children.push({
          value: node.value - childSum,
          filler: true
        });
      }
      children.forEach(function(child, idx) {
        return d3.flameGraphUtils.augment(child, location.concat([idx]));
      });
      node.level += children.reduce((function(max, child) {
        return Math.max(child.level, max);
      }), 0);
      node.augmented = true;
      return node;
    },
    partition: function(data) {
      return d3.layout.partition().sort(function(a, b) {
        if (a.filler) {
          return 1;
        }
        if (b.filler) {
          return -1;
        }
        return a.name.localeCompare(b.name);
      }).nodes(data);
    },
    hide: function(nodes, unhide) {
      var process, processChildren, processParents, remove, sum;
      if (unhide == null) {
        unhide = false;
      }
      sum = function(arr) {
        return arr.reduce((function(acc, val) {
          return acc + val;
        }), 0);
      };
      remove = function(arr, val) {
        var pos;
        pos = arr.indexOf(val);
        if (pos >= 0) {
          return arr.splice(pos, 1);
        }
      };
      process = function(node, val) {
        if (unhide) {
          remove(node.hidden, val);
        } else {
          node.hidden.push(val);
        }
        return node.value = Math.max(node.originalValue - sum(node.hidden), 0);
      };
      processChildren = function(node, val) {
        if (!node.children) {
          return;
        }
        return node.children.forEach(function(child) {
          process(child, val);
          return processChildren(child, val);
        });
      };
      processParents = function(node, val) {
        var results;
        results = [];
        while (node.parent) {
          process(node.parent, val);
          results.push(node = node.parent);
        }
        return results;
      };
      return nodes.forEach(function(node) {
        var val;
        val = node.originalValue;
        processParents(node, val);
        process(node, val);
        return processChildren(node, val);
      });
    }
  };

  d3.flameGraph = function(selector, root) {
    var FlameGraph, getClassAndMethodName, hash;
    getClassAndMethodName = function(fqdn) {
      var tokens;
      if (!fqdn) {
        return "";
      }
      tokens = fqdn.split(".");
      return tokens.slice(tokens.length - 2).join(".");
    };
    hash = function(name) {
      var i, j, maxHash, mod, ref, ref1, result, weight;
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
    FlameGraph = (function() {
      function FlameGraph(selector, root) {
        this._selector = selector;
        this._generateAccessors(['margin', 'cellHeight', 'zoomEnabled', 'zoomAction', 'tooltip', 'color']);
        this._ancestors = [];
        this._size = [1200, 800];
        this._cellHeight = 20;
        this._margin = {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        };
        this._color = function(d) {
          var b, g, r, val;
          val = hash(d.name);
          r = 200 + Math.round(55 * val);
          g = 0 + Math.round(230 * (1 - val));
          b = 0 + Math.round(55 * (1 - val));
          return "rgb(" + r + ", " + g + ", " + b + ")";
        };
        this._tooltipEnabled = true;
        this._zoomEnabled = true;
        d3.select(this._selector).select('svg').remove();
        this.container = d3.select(this._selector).append('svg').attr('class', 'flame-graph').attr('width', this._size[0]).attr('height', this._size[1]).append('g').attr('transform', "translate(" + (this.margin().left) + ", " + (this.margin().top) + ")");
        console.time('augment');
        this.original = d3.flameGraphUtils.augment(root, [0]);
        console.timeEnd('augment');
        this.root(this.original);
      }

      FlameGraph.prototype.size = function(size) {
        if (!size) {
          return this._size;
        }
        this._size = size;
        d3.select(this._selector).select('.flame-graph').attr('width', this._size[0]).attr('height', this._size[1]);
        return this;
      };

      FlameGraph.prototype.root = function(root) {
        if (!root) {
          return this._root;
        }
        console.time('partition');
        this._root = root;
        this._data = d3.flameGraphUtils.partition(this._root);
        console.timeEnd('partition');
        return this;
      };

      FlameGraph.prototype.hide = function(predicate, unhide) {
        var matches;
        if (unhide == null) {
          unhide = false;
        }
        matches = this.select(predicate, false);
        if (!matches.length) {
          return;
        }
        d3.flameGraphUtils.hide(matches, unhide);
        this._data = d3.flameGraphUtils.partition(this._root);
        return this.render();
      };

      FlameGraph.prototype.zoom = function(node) {
        if (!this.zoomEnabled()) {
          throw new Error("Zoom is disabled!");
        }
        this.tip.hide();
        if (indexOf.call(this._ancestors, node) >= 0) {
          this._ancestors = this._ancestors.slice(0, this._ancestors.indexOf(node));
        } else {
          this._ancestors.push(this._root);
        }
        this.root(node).render();
        if (typeof this._zoomAction === "function") {
          this._zoomAction(node);
        }
        return this;
      };

      FlameGraph.prototype.width = function() {
        return this.size()[0] - (this.margin().left + this.margin().right);
      };

      FlameGraph.prototype.height = function() {
        return this.size()[1] - (this.margin().top + this.margin().bottom);
      };

      FlameGraph.prototype.label = function(d) {
        var label;
        if (!(d != null ? d.name : void 0)) {
          return "";
        }
        label = getClassAndMethodName(d.name);
        return label.substr(0, Math.round(this.x(d.dx) / (this.cellHeight() / 10 * 4)));
      };

      FlameGraph.prototype.select = function(predicate, onlyVisible) {
        var result;
        if (onlyVisible == null) {
          onlyVisible = true;
        }
        if (onlyVisible) {
          return this.container.selectAll('.node').filter(predicate);
        } else {
          result = d3.flameGraphUtils.partition(this.original).filter(predicate);
          return result;
        }
      };

      FlameGraph.prototype.render = function() {
        var data, existingContainers, maxLevels, newContainers, ref, renderNode, visibleCells;
        if (!this._selector) {
          throw new Error("No DOM element provided");
        }
        console.time('render');
        this.fontSize = (this.cellHeight() / 10) * 0.4;
        this.x = d3.scale.linear().domain([
          0, d3.max(this._data, function(d) {
            return d.x + d.dx;
          })
        ]).range([0, this.width()]);
        visibleCells = Math.floor(this.height() / this.cellHeight());
        maxLevels = this._root.level;
        this.y = d3.scale.quantize().domain([
          d3.max(this._data, function(d) {
            return d.y;
          }), 0
        ]).range(d3.range(maxLevels).map((function(_this) {
          return function(cell) {
            return ((cell + visibleCells) - (_this._ancestors.length + maxLevels)) * _this.cellHeight();
          };
        })(this)));
        data = this._data.filter((function(_this) {
          return function(d) {
            return _this.x(d.dx) > 0.4 && _this.y(d.y) >= 0 && !d.filler;
          };
        })(this));
        renderNode = {
          x: (function(_this) {
            return function(d) {
              return _this.x(d.x);
            };
          })(this),
          y: (function(_this) {
            return function(d) {
              return _this.y(d.y);
            };
          })(this),
          width: (function(_this) {
            return function(d) {
              return _this.x(d.dx);
            };
          })(this),
          height: (function(_this) {
            return function(d) {
              return _this.cellHeight();
            };
          })(this),
          text: (function(_this) {
            return function(d) {
              if (d.name && _this.x(d.dx) > 40) {
                return _this.label(d);
              }
            };
          })(this)
        };
        existingContainers = this.container.selectAll('.node').data(data, function(d) {
          return d.location.join(".");
        }).attr('class', 'node');
        this._renderNodes(existingContainers, renderNode);
        newContainers = existingContainers.enter().append('g').attr('class', 'node');
        this._renderNodes(newContainers, renderNode, true);
        existingContainers.exit().remove();
        if (this.zoomEnabled()) {
          this._renderAncestors()._enableNavigation();
        }
        if (this.tooltip()) {
          this._renderTooltip();
        }
        console.timeEnd('render');
        console.log("Processed " + this._data.length + " items");
        console.log("Rendered " + ((ref = this.container.selectAll('.node')[0]) != null ? ref.length : void 0) + " elements");
        return this;
      };

      FlameGraph.prototype._renderNodes = function(containers, attrs, enter) {
        var targetLabels, targetRects;
        if (enter == null) {
          enter = false;
        }
        if (!enter) {
          targetRects = containers.selectAll('rect');
        }
        if (enter) {
          targetRects = containers.append('rect');
        }
        targetRects.attr('fill', (function(_this) {
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
        containers.selectAll('text').attr('class', 'label').style('font-size', this.fontSize + "em").transition().attr('dy', (this.fontSize / 2) + "em").attr('x', (function(_this) {
          return function(d) {
            return attrs.x(d) + 2;
          };
        })(this)).attr('y', (function(_this) {
          return function(d, idx) {
            return attrs.y(d, idx) + _this.cellHeight() / 2;
          };
        })(this)).text(attrs.text);
        return this;
      };

      FlameGraph.prototype._renderTooltip = function() {
        this.tip = d3.tip().attr('class', 'd3-tip').html(this.tooltip()).direction((function(_this) {
          return function(d) {
            if (_this.x(d.x) + _this.x(d.dx) / 2 > _this.width() - 100) {
              return 'w';
            }
            if (_this.x(d.x) + _this.x(d.dx) / 2 < 100) {
              return 'e';
            }
            return 's';
          };
        })(this)).offset((function(_this) {
          return function(d) {
            var x, xOffset, yOffset;
            x = _this.x(d.x) + _this.x(d.dx) / 2;
            xOffset = Math.max(Math.ceil(_this.x(d.dx) / 2), 5);
            yOffset = Math.ceil(_this.cellHeight() / 2);
            if (_this.width() - 100 < x) {
              return [0, -xOffset];
            }
            if (x < 100) {
              return [0, xOffset];
            }
            return [yOffset, 0];
          };
        })(this));
        this.container.call(this.tip);
        this.container.selectAll('.node').on('mouseover', this.tip.show).on('mouseout', this.tip.hide);
        return this;
      };

      FlameGraph.prototype._renderAncestors = function() {
        var ancestor, ancestorData, ancestors, idx, j, len, newAncestors, prev, renderAncestor;
        if (!this._ancestors.length) {
          ancestors = this.container.selectAll('.ancestor').remove();
          return this;
        }
        ancestorData = this._ancestors.map(function(ancestor, idx) {
          return {
            name: ancestor.name,
            value: idx + 1,
            location: ancestor.location
          };
        });
        for (idx = j = 0, len = ancestorData.length; j < len; idx = ++j) {
          ancestor = ancestorData[idx];
          prev = ancestorData[idx - 1];
          if (prev) {
            prev.children = [ancestor];
          }
        }
        renderAncestor = {
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
              return "↩ " + (getClassAndMethodName(d.name));
            };
          })(this)
        };
        ancestors = this.container.selectAll('.ancestor').data(d3.layout.partition().nodes(ancestorData[0]), function(d) {
          return d.location.join(".");
        });
        this._renderNodes(ancestors, renderAncestor);
        newAncestors = ancestors.enter().append('g').attr('class', 'ancestor');
        this._renderNodes(newAncestors, renderAncestor, true);
        ancestors.exit().remove();
        return this;
      };

      FlameGraph.prototype._enableNavigation = function() {
        this.container.selectAll('.node').on('click', (function(_this) {
          return function(d) {
            _this.tip.hide();
            if (Math.round(_this.width() - _this.x(d.dx)) > 0) {
              return _this.zoom(d);
            }
          };
        })(this));
        this.container.selectAll('.ancestor').on('click', (function(_this) {
          return function(d, idx) {
            _this.tip.hide();
            return _this.zoom(_this._ancestors[idx]);
          };
        })(this));
        return this;
      };

      FlameGraph.prototype._generateAccessors = function(accessors) {
        var accessor, j, len, results;
        results = [];
        for (j = 0, len = accessors.length; j < len; j++) {
          accessor = accessors[j];
          results.push(this[accessor] = (function(accessor) {
            return function(newValue) {
              if (!arguments.length) {
                return this["_" + accessor];
              }
              this["_" + accessor] = newValue;
              return this;
            };
          })(accessor));
        }
        return results;
      };

      return FlameGraph;

    })();
    return new FlameGraph(selector, root);
  };

}).call(this);
