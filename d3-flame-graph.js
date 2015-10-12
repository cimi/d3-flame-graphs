(function() {
  var d3;

  d3 = window.d3;

  if (!d3) {
    throw new Error("d3.js needs to be loaded");
  }

  d3.flameGraph = function() {
    var FlameGraph, getClassAndMethodName, hash, partitionData;
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
    partitionData = function(data) {
      return d3.layout.partition().sort(function(a, b) {
        if (!a.name) {
          return 1;
        }
        if (!b.name) {
          return -1;
        }
        return a.name.localeCompare(b.name);
      }).nodes(data);
    };
    FlameGraph = (function() {
      function FlameGraph() {
        this._generateAccessors(['size', 'margin', 'cellHeight', 'breadcrumbs', 'tooltip', 'color']);
        this._allData = [];
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
      }

      FlameGraph.prototype.data = function(data) {
        if (!data) {
          return this._data;
        }
        this._allData.push(data);
        this.total = data.value;
        this._data = partitionData(data);
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
        return label.substr(0, Math.round(this.x(d.dx) / 4));
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
          result = partitionData(this._allData[0]).filter(function(d) {
            return regex.test(d.name);
          });
          console.log(result);
          return result;
        }
      };

      FlameGraph.prototype.render = function(selector) {
        var nodes, ref;
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
            return (cell - _this.maxDepth + _this.maxCells) * _this.cellHeight();
          };
        })(this)));
        nodes = this.container.selectAll('.node').data(this.data().filter((function(_this) {
          return function(d) {
            return _this.x(d.dx) > 0.1 && _this.y(d.y) >= 0 && !d.filler;
          };
        })(this))).enter().append('g').attr('class', 'node');
        nodes.append('rect').attr('width', (function(_this) {
          return function(d) {
            return _this.x(d.dx);
          };
        })(this)).attr('height', (function(_this) {
          return function(d) {
            return _this.cellHeight();
          };
        })(this)).attr('x', (function(_this) {
          return function(d) {
            return _this.x(d.x);
          };
        })(this)).attr('y', (function(_this) {
          return function(d) {
            return _this.y(d.y);
          };
        })(this)).attr('fill', (function(_this) {
          return function(d) {
            return _this.color()(d);
          };
        })(this));
        nodes.append('text').attr('class', 'label').attr('width', (function(_this) {
          return function(d) {
            return _this.x(d.dx);
          };
        })(this)).attr('dy', '.25em').attr('x', (function(_this) {
          return function(d) {
            return _this.x(d.x) + 2;
          };
        })(this)).attr('y', (function(_this) {
          return function(d) {
            return _this.y(d.y) + _this.cellHeight() / 2;
          };
        })(this)).text((function(_this) {
          return function(d) {
            if (d.name && _this.x(d.dx) > 40) {
              return _this.label(d);
            }
          };
        })(this));
        nodes.append('rect').attr('class', 'overlay').attr('width', (function(_this) {
          return function(d) {
            return _this.x(d.dx);
          };
        })(this)).attr('height', (function(_this) {
          return function(d) {
            return _this.cellHeight();
          };
        })(this)).attr('x', (function(_this) {
          return function(d) {
            return _this.x(d.x);
          };
        })(this)).attr('y', (function(_this) {
          return function(d) {
            return _this.y(d.y);
          };
        })(this));
        console.timeEnd('render');
        console.log("Rendered " + ((ref = this.container.selectAll('.node')[0]) != null ? ref.length : void 0) + " elements");
        if (this.breadcrumbs()) {
          this._enableNavigation()._renderBreadcrumbs();
        }
        if (this.tooltip()) {
          this._renderTooltip();
        }
        return this;
      };

      FlameGraph.prototype._renderTooltip = function() {
        this.tip = d3.tip().attr('class', 'd3-tip').html((function(_this) {
          return function(d) {
            return d.name + " <br /><br />" + d.time + " run time<br />" + (((d.value / _this.total) * 100).toFixed(2)) + "% of total";
          };
        })(this)).direction((function(_this) {
          return function(d) {
            if (_this.x(d.x) + _this.x(d.dx) / 2 > _this.width() - 100) {
              return 'w';
            }
            if (_this.x(d.x) + _this.x(d.dx) / 2 < 100) {
              return 'e';
            }
            if (_this.y(d.y) < 100) {
              return 's';
            }
            return 'n';
          };
        })(this)).offset((function(_this) {
          return function(d) {
            var x, xOffset, yOffset;
            x = _this.x(d.x) + _this.x(d.dx) / 2;
            xOffset = _this.x(d.dx) / 2;
            yOffset = _this.cellHeight() / 2;
            if (_this.width() - 100 < x) {
              return [0, -xOffset];
            }
            if (x < 100) {
              return [0, xOffset];
            }
            if (_this.y(d.y) < 100) {
              return [yOffset, 0];
            }
            return [-yOffset, 0];
          };
        })(this));
        this.container.call(this.tip);
        this.container.selectAll('.node').on('mouseover', this.tip.show).on('mouseout', this.tip.hide);
        return this;
      };

      FlameGraph.prototype._renderBreadcrumbs = function() {
        var breadcrumbData, breadcrumbs;
        breadcrumbData = this._allData.map(function(prevData, idx) {
          return {
            name: prevData.name,
            value: idx
          };
        });
        breadcrumbs = d3.select(this.breadcrumbs()).selectAll('li').data(breadcrumbData);
        breadcrumbs.enter().append('li').append('a').attr('title', function(d) {
          return d.name;
        }).text(function(d) {
          return getClassAndMethodName(d.name);
        }).on('click', (function(_this) {
          return function(breadcrumb) {
            var displayed, idx;
            idx = breadcrumb.value;
            displayed = _this._allData[idx];
            _this._allData = _this._allData.slice(0, idx);
            return _this.data(displayed).render(_this._selector);
          };
        })(this));
        breadcrumbs.exit().remove();
        return this;
      };

      FlameGraph.prototype._enableNavigation = function() {
        this.container.selectAll('.node').on('click', (function(_this) {
          return function(d) {
            d3.event.stopPropagation();
            return _this.data(d).render(_this._selector);
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
