(function() {
  var d3,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  d3 = window.d3;

  if (!d3) {
    throw new Error("d3.js needs to be loaded");
  }

  d3.flameGraph = function() {
    var FlameGraph, addFillerNodes, addMaxDepth, getClassAndMethodName, hash, partitionData;
    getClassAndMethodName = function(fqdn) {
      var tokens;
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
    addFillerNodes = function(node) {
      var childSum, children;
      children = node.children;
      if (!children) {
        return node;
      }
      if (children.filter(function(child) {
        return child.filler;
      }).length > 0) {
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
      children.forEach(addFillerNodes);
      return node;
    };
    addMaxDepth = function(node) {
      var computeDepth;
      computeDepth = function(node) {
        var max;
        if (!node) {
          return 0;
        }
        if (!node.children) {
          return 1;
        }
        if (node.maxDepth) {
          return node.maxDepth;
        }
        max = node.children.map(computeDepth).reduce((function(max, depth) {
          if (depth > max) {
            return depth;
          } else {
            return max;
          }
        }), 0);
        node.maxDepth = max + 1;
        return node.maxDepth;
      };
      computeDepth(node);
      return node;
    };
    partitionData = function(data) {
      return d3.layout.partition().sort(function(a, b) {
        if (a.filler) {
          return 1;
        }
        if (b.filler) {
          return -1;
        }
        return a.name.localeCompare(b.name);
      }).nodes(data);
    };
    FlameGraph = (function() {
      function FlameGraph() {
        this._generateAccessors(['size', 'margin', 'cellHeight', 'zoomEnabled', 'tooltip', 'color']);
        this._ancestors = [];
        this._size = [1200, 800];
        this._cellHeight = 10;
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
      }

      FlameGraph.prototype.data = function(data) {
        if (!data) {
          return this._data;
        }
        if (!this.original) {
          this.original = data;
        }
        this._data = partitionData(addMaxDepth(addFillerNodes(data)));
        return this;
      };

      FlameGraph.prototype.zoom = function(node) {
        if (!this.zoomEnabled()) {
          throw new Error("Zoom is disabled!");
        }
        if (indexOf.call(this._ancestors, node) >= 0) {
          this._ancestors = this._ancestors.slice(0, this._ancestors.indexOf(node));
        } else {
          this._ancestors.push(this.data()[0]);
        }
        this.data(node).render(this._selector);
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

      FlameGraph.prototype.select = function(regex, onlyVisible) {
        var result;
        if (onlyVisible == null) {
          onlyVisible = true;
        }
        if (onlyVisible) {
          return this.container.selectAll('.node').filter(function(d) {
            return regex.test(d.name);
          });
        } else {
          result = partitionData(this.original).filter(function(d) {
            return regex.test(d.name);
          });
          return result;
        }
      };

      FlameGraph.prototype.render = function(selector) {
        var containers, ref;
        if (!(this._selector || selector)) {
          throw new Error("The container's selector needs to be provided before rendering");
        }
        console.time('render');
        if (selector) {
          this._selector = selector;
        }
        d3.select(selector).select('svg').remove();
        this.container = d3.select(selector).append('svg').attr('class', 'flame-graph').attr('width', this.size()[0]).attr('height', this.size()[1]).append('g').attr('transform', "translate(" + (this.margin().left) + ", " + (this.margin().top) + ")");
        this.maxCells = Math.floor(this.height() / this.cellHeight());
        this.maxDepth = this.data()[0].maxDepth;
        this.fontSize = (this.cellHeight() / 10) * 0.4;
        this.x = d3.scale.linear().domain([
          0, d3.max(this.data(), function(d) {
            return d.x + d.dx;
          })
        ]).range([0, this.width()]);
        this.y = d3.scale.quantize().domain([
          d3.max(this.data(), function(d) {
            return d.y;
          }), 0
        ]).range(d3.range(this.maxDepth).map((function(_this) {
          return function(cell) {
            return (cell - _this.maxDepth + _this.maxCells - _this._ancestors.length) * _this.cellHeight();
          };
        })(this)));
        containers = this.container.selectAll('.node').data(this.data().filter((function(_this) {
          return function(d) {
            return _this.x(d.dx) > 0.1 && _this.y(d.y) >= 0 && !d.filler;
          };
        })(this))).enter().append('g').attr('class', function(d, idx) {
          if (idx === 0) {
            return 'root node';
          } else {
            return 'node';
          }
        });
        this._renderNodes(containers, {
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
        });
        console.timeEnd('render');
        console.log("Rendered " + ((ref = this.container.selectAll('.node')[0]) != null ? ref.length : void 0) + " elements");
        if (this.zoomEnabled()) {
          this._renderAncestors()._enableNavigation();
        }
        if (this.tooltip()) {
          this._renderTooltip();
        }
        return this;
      };

      FlameGraph.prototype._renderNodes = function(containers, attrs) {
        containers.append('rect').attr('width', attrs.width).attr('height', this.cellHeight()).attr('x', attrs.x).attr('y', attrs.y).attr('fill', (function(_this) {
          return function(d) {
            return _this.color()(d);
          };
        })(this));
        containers.append('text').attr('class', 'label').attr('dy', (this.fontSize / 2) + "em").attr('x', (function(_this) {
          return function(d) {
            return attrs.x(d) + 2;
          };
        })(this)).attr('y', (function(_this) {
          return function(d, idx) {
            return attrs.y(d, idx) + _this.cellHeight() / 2;
          };
        })(this)).style('font-size', this.fontSize + "em").text(attrs.text);
        containers.append('rect').attr('class', 'overlay').attr('width', attrs.width).attr('height', this.cellHeight()).attr('x', attrs.x).attr('y', attrs.y);
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
        var ancestorData, ancestors, containers;
        ancestorData = this._ancestors.map(function(ancestor, idx) {
          return {
            name: ancestor.name,
            value: idx
          };
        });
        ancestors = this.container.selectAll('.ancestor').data(ancestorData);
        containers = ancestors.enter().append('g').attr('class', 'ancestor');
        this._renderNodes(containers, {
          x: (function(_this) {
            return function(d) {
              return 0;
            };
          })(this),
          y: (function(_this) {
            return function(d, idx) {
              return _this.height() - ((idx + 1) * _this.cellHeight());
            };
          })(this),
          width: this.width(),
          height: this.cellHeight(),
          text: (function(_this) {
            return function(d) {
              return "↩ " + (getClassAndMethodName(d.name));
            };
          })(this)
        });
        return this;
      };

      FlameGraph.prototype._enableNavigation = function() {
        this.container.selectAll('.node').on('click', (function(_this) {
          return function(d, idx) {
            d3.event.stopPropagation();
            if (idx > 0) {
              return _this.zoom(d);
            }
          };
        })(this));
        this.container.selectAll('.ancestor').on('click', (function(_this) {
          return function(d, idx) {
            d3.event.stopPropagation();
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
    return new FlameGraph();
  };

}).call(this);
